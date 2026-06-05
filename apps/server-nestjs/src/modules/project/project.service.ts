import type { projectContract } from '@cpn-console/shared'
import type { UserContext } from '../infrastructure/auth/auth.service'
import type { ProjectDataExport, ProjectDetails } from './project-queries.utils.js'
import { AdminAuthorized } from '@cpn-console/shared'
import { BadRequestException, ForbiddenException, Inject, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { trace } from '@opentelemetry/api'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service.js'
import { PrismaService } from '../infrastructure/database/prisma.service.js'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'
import { createProjectMember, deleteProjectMember } from '../project-members/project-members-queries.utils.js'
import { VaultClientService } from '../vault/vault-client.service.js'
import { VaultService } from '../vault/vault.service.js'
import { generateProjectPath } from '../vault/vault.utils.js'
import {
  createProject,
  deleteProjectDependencies,
  getNotArchivedProjectForUpdate,
  getProject,
  getProjectNotArchived,
  getProjectSlug,
  listProjectIdsNotArchived,
  listProjects,
  listProjectsForDataExport,
  listProjectSlugsForPrefix as listProjectSlugsForSlugPrefix,
  updateProject,
  updateProjectLocked,
} from './project-queries.utils.js'
import { generateProjectCreateInput, generateProjectWhereInput, generateSlug, parseProjectUpdateInput, parseSecretValue } from './project.utils.js'

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name)

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
    @Inject(VaultService) private readonly vault: VaultService,
    @Inject(VaultClientService) private readonly vaultClient: VaultClientService,
  ) {}

  @StartActiveSpan()
  async getData(): Promise<ProjectDataExport[]> {
    const span = trace.getActiveSpan()
    this.logger.log('project.getData requested')
    const data = await listProjectsForDataExport(this.prisma)
    span?.setAttribute('project.data.count', data.length)
    this.logger.log(`project.getData completed (count=${data.length})`)
    return data
  }

  @StartActiveSpan()
  async list(
    query: typeof projectContract.listProjects.query._type,
    user: UserContext,
  ): Promise<ProjectDetails[]> {
    const span = trace.getActiveSpan()
    const { filter = 'member' } = query
    span?.setAttribute('project.list.filter', filter)
    span?.setAttribute('user.id', user.userId)

    if (filter === 'all' && !AdminAuthorized.Manage(user.adminPermissions)) {
      this.logger.warn(`project.list forbidden (requestorUserId=${user.userId}, filter=${filter})`)
      throw new ForbiddenException('Seuls les admins avec les droits de visionnage des projets peuvent utiliser le filtre \'all\'')
    }

    const whereAnd = generateProjectWhereInput({
      query,
      requestorUserId: user.userId,
      appVersion: this.config.appVersion,
    })

    this.logger.debug(`project.list started (requestorUserId=${user.userId}, filter=${filter})`)
    const projects = await listProjects(this.prisma, whereAnd)
    span?.setAttribute('project.list.count', projects.length)
    this.logger.debug(`project.list completed (requestorUserId=${user.userId}, filter=${filter}, count=${projects.length})`)

    return projects
  }

  @StartActiveSpan()
  async get(projectId: string) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.id', projectId)
    this.logger.debug(`project.get started (projectId=${projectId})`)
    const project = await getProjectNotArchived(this.prisma, projectId)
    if (!project) {
      this.logger.warn(`project.get notFound (projectId=${projectId})`)
      throw new NotFoundException()
    }
    this.logger.debug(`project.get completed (projectId=${projectId})`)
    return project
  }

  @StartActiveSpan()
  async create(body: typeof projectContract.createProject.body._type, requestorUserId: string): Promise<ProjectDetails> {
    const span = trace.getActiveSpan()
    span?.setAttribute('user.id', requestorUserId)
    this.logger.log(`project.create started (requestorUserId=${requestorUserId}, projectName=${body.name})`)
    try {
      const project = await this.prisma.$transaction(async (tx) => {
        const existingSlugs = await listProjectSlugsForSlugPrefix(tx, body.name)
        const slug = generateSlug(body.name, existingSlugs.map(s => s.slug))

        const created = await createProject(tx, generateProjectCreateInput(body, requestorUserId, slug))
        const loaded = await getProject(tx, created.id)
        if (!loaded) throw new InternalServerErrorException('Project created but cannot be loaded')
        return loaded
      })
      await this.eventEmitter.emitAsync('project.upsert', project)
      span?.setAttribute('project.id', project.id)
      span?.setAttribute('project.slug', project.slug)
      this.logger.log(`project.create completed (requestorUserId=${requestorUserId}, projectId=${project.id}, slug=${project.slug})`)
      return project
    } catch (error) {
      this.logger.error(
        `project.create failed (requestorUserId=${requestorUserId}, projectName=${body.name}): ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      )
      throw error
    }
  }

  async update(
    body: typeof projectContract.updateProject.body._type,
    user: UserContext,
    projectId: string,
  ): Promise<ProjectDetails> {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.id', projectId)
    span?.setAttribute('user.id', user.userId)
    this.logger.log(`project.update started (projectId=${projectId}, requestorUserId=${user.userId})`)
    try {
      const project = await this.prisma.$transaction(async (tx) => {
        const projectDb = await getNotArchivedProjectForUpdate(tx, projectId)
        if (!projectDb) throw new NotFoundException()

        const isOwner = projectDb.ownerId === user.userId
        const isAdmin = AdminAuthorized.Manage(user.adminPermissions)
        const effectiveData: Record<string, unknown> = { ...body }
        const strippedKeys: string[] = []
        if (!isAdmin) {
          if ('locked' in effectiveData) strippedKeys.push('locked')
          delete effectiveData.locked
          if (!isOwner) {
            if ('ownerId' in effectiveData) strippedKeys.push('ownerId')
            delete effectiveData.ownerId
          }
        }

        if (strippedKeys.length) {
          span?.setAttribute('project.update.strippedKeys.count', strippedKeys.length)
          this.logger.debug(`project.update strippedFields (projectId=${projectId}, requestorUserId=${user.userId}, strippedKeys=${strippedKeys.join(',')})`)
        }

        if (projectDb.locked && effectiveData.locked !== false) {
          throw new ForbiddenException('Veuillez déverrouiller le projet pour le mettre à jour')
        }

        const ownerIdCandidate = effectiveData.ownerId as string | undefined
        if (ownerIdCandidate && ownerIdCandidate !== projectDb.ownerId) {
          this.logger.log(`project.update ownerChange started (projectId=${projectId}, requestorUserId=${user.userId}, previousOwnerId=${projectDb.ownerId}, nextOwnerId=${ownerIdCandidate})`)
          const memberCandidate = projectDb.members.find(member => member.userId === ownerIdCandidate)
          if (!memberCandidate) {
            throw new BadRequestException('Le nouveau propriétaire doit faire partie des membres actuels du projet')
          }
          if (memberCandidate.user.type !== 'human') {
            throw new BadRequestException('Seuls les comptes humains peuvent être propriétaire de projets')
          }
          const oldOwnerIsMember = projectDb.members.some(member => member.userId === projectDb.ownerId)
          if (!oldOwnerIsMember) {
            await createProjectMember(tx, projectDb.id, projectDb.ownerId)
          }
          await deleteProjectMember(tx, projectDb.id, ownerIdCandidate)
          await updateProject(tx, projectDb.id, { owner: { connect: { id: ownerIdCandidate } } })
          this.logger.log(`project.update ownerChange completed (projectId=${projectId}, requestorUserId=${user.userId}, previousOwnerId=${projectDb.ownerId}, nextOwnerId=${ownerIdCandidate})`)
        }

        const updateData = parseProjectUpdateInput(effectiveData)
        const effectiveKeys = Object.keys(effectiveData)
        span?.setAttribute('project.update.effectiveKeys.count', effectiveKeys.length)
        await updateProject(tx, projectId, updateData)

        const updated = await getProject(tx, projectId)
        if (!updated) throw new NotFoundException()
        this.logger.log(`project.update dbUpdated (projectId=${projectId}, requestorUserId=${user.userId}, effectiveKeys=${effectiveKeys.join(',')})`)
        return updated
      })
      await this.eventEmitter.emitAsync('project.upsert', project)
      span?.setAttribute('project.slug', project.slug)
      this.logger.log(`project.update completed (projectId=${projectId}, requestorUserId=${user.userId})`)
      return project
    } catch (error) {
      this.logger.error(
        `project.update failed (projectId=${projectId}, requestorUserId=${user.userId}): ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      )
      throw error
    }
  }

  @StartActiveSpan()
  async archive(projectId: string): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.id', projectId)
    this.logger.log(`project.archive started (projectId=${projectId})`)
    try {
      const project = await this.prisma.$transaction(async (tx) => {
        const loaded = await getProject(tx, projectId)
        if (!loaded) throw new NotFoundException()

        await deleteProjectDependencies(tx, projectId)

        const archivedSuffix = `${Date.now()}_archived`
        await updateProject(tx, projectId, {
          name: `${loaded.name}_${archivedSuffix}`,
          slug: `${loaded.slug}_${archivedSuffix}`,
          status: 'archived',
          locked: true,
          clusters: { set: [] },
        })

        return loaded
      })
      await this.eventEmitter.emitAsync('project.delete', project)
      span?.setAttribute('project.slug', project.slug)
      this.logger.log(`project.archive completed (projectId=${projectId}, slug=${project.slug})`)
    } catch (error) {
      this.logger.error(
        `project.archive failed (projectId=${projectId}): ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      )
      throw error
    }
  }

  @StartActiveSpan()
  async replayHooks(projectId: string): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.id', projectId)
    this.logger.log(`project.replayHooks started (projectId=${projectId})`)
    const project = await this.get(projectId)
    span?.setAttribute('project.slug', project.slug)
    await this.eventEmitter.emitAsync('project.upsert', project)
    this.logger.log(`project.replayHooks completed (projectId=${projectId})`)
  }

  @StartActiveSpan()
  async bulkAction(
    data: typeof projectContract.bulkActionProject.body._type,
  ): Promise<void> {
    const span = trace.getActiveSpan()
    const projectSelector = data.projectIds
    span?.setAttribute('project.bulk.action', data.action)
    const projectIdsLog = projectSelector === 'all' ? 'all' : `count=${projectSelector.length}`
    this.logger.log(`project.bulkAction started (action=${data.action}, projectIds=${projectIdsLog})`)
    try {
      let projectIds = data.projectIds
      if (projectIds === 'all') {
        projectIds = (await listProjectIdsNotArchived(this.prisma))
          .map(({ id }) => id)
      }
      span?.setAttribute('project.bulk.count', projectIds.length)

      const tasks = projectIds.map((projectId) => {
        if (data.action === 'archive') {
          return () => this.archive(projectId)
        }
        if (data.action === 'lock' || data.action === 'unlock') {
          return () => updateProjectLocked(this.prisma, projectId, data.action === 'lock')
        }
        if (data.action === 'replay') {
          return () => this.replayHooks(projectId)
        }
        return async () => undefined
      })

      const results = await Promise.allSettled(tasks.map(t => t()))
      const summary = results.reduce(
        (acc, r) => {
          if (r.status === 'fulfilled') acc.fulfilled += 1
          else acc.rejected += 1
          return acc
        },
        { fulfilled: 0, rejected: 0 },
      )
      span?.setAttributes({
        'project.bulk.fulfilled': summary.fulfilled,
        'project.bulk.rejected': summary.rejected,
      })
      this.logger.log(`project.bulkAction completed (action=${data.action}, projectCount=${projectIds.length}, fulfilled=${summary.fulfilled}, rejected=${summary.rejected})`)
    } catch (error) {
      this.logger.error(
        `project.bulkAction failed (action=${data.action}, projectIds=${projectSelector === 'all' ? 'all' : `count=${projectSelector.length}`}): ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      )
      throw error
    }
  }

  @StartActiveSpan()
  async getSecrets(projectId: string): Promise<Record<string, Record<string, string>>> {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.id', projectId)
    this.logger.log(`project.getSecrets started (projectId=${projectId})`)
    try {
      const project = await getProjectSlug(this.prisma, projectId)
      if (!project) throw new NotFoundException()
      span?.setAttribute('project.slug', project.slug)
      const projectPath = generateProjectPath(this.config.projectRootDir, project.slug)

      const result: Record<string, Record<string, string>> = {}
      const relativePaths = await this.vault.listProjectSecrets(project.slug)
      span?.setAttribute('vault.secretFiles.count', relativePaths.length)
      this.logger.debug(`project.getSecrets listed (projectId=${projectId}, slug=${project.slug}, secretFiles=${relativePaths.length})`)

      for (const relativePath of relativePaths) {
        const fullPath = `${projectPath}/${relativePath}`
        const secret = await this.vaultClient.read<Record<string, any>>(fullPath).catch(() => null)
        if (!secret?.data) continue

        const [group, ...rest] = relativePath.split('/').filter(Boolean)
        if (!group) continue
        const prefix = rest.length ? `${rest.join('/')}.` : ''
        const groupObj = (result[group] ??= {})
        for (const [key, value] of Object.entries(secret.data)) {
          groupObj[`${prefix}${key}`] = parseSecretValue(value)
        }
      }

      const groupCount = Object.keys(result).length
      const keyCount = Object.values(result).reduce((acc, group) => acc + Object.keys(group).length, 0)
      span?.setAttributes({
        'vault.secretGroups.count': groupCount,
        'vault.secretKeys.count': keyCount,
      })
      this.logger.log(`project.getSecrets completed (projectId=${projectId}, slug=${project.slug}, groupCount=${groupCount}, keyCount=${keyCount})`)
      return result
    } catch (error) {
      this.logger.error(
        `project.getSecrets failed (projectId=${projectId}): ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      )
      throw error
    }
  }
}
