import type { projectContract } from '@cpn-console/shared'
import type { Prisma } from '@prisma/client'
import type { UserContext } from '../infrastructure/auth/auth-user.decorator'
import type { ProjectDataExport, ProjectUpdateContext, ProjectWithDetails } from './project-queries.utils'
import { AdminAuthorized } from '@cpn-console/shared'
import { BadRequestException, ForbiddenException, Inject, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { trace } from '@opentelemetry/api'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'
import { LogService } from '../log/log.service'
import { createProjectMember, deleteProjectMember } from '../project-members/project-members-queries.utils'
import {
  createProject,
  deleteProjectDependencies,
  getNotArchivedProjectForUpdate,
  getProject,
  listProjectSlugsForPrefix as listProjectSlugsForSlugPrefix,
  projectForDataSelect,
  projectSelect,
  updateProject,
} from './project-queries.utils'
import { generateProjectCreateInput, generateProjectWhereInput, generateSlug, parseProjectUpdateInput } from './project.utils'

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name)

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
    @Inject(LogService) private readonly logs: LogService,
  ) {}

  @StartActiveSpan()
  async getProjectsData(): Promise<ProjectDataExport[]> {
    const span = trace.getActiveSpan()
    this.logger.log('project.getData requested')
    const data = await this.listProjectsForDataExport()
    span?.setAttribute('project.data.count', data.length)
    this.logger.log(`project.getData completed (count=${data.length})`)
    return data
  }

  @StartActiveSpan()
  async listProjects(
    query: typeof projectContract.listProjects.query._type,
    user: UserContext,
  ): Promise<ProjectWithDetails[]> {
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
    const projects = await this.fetchProjects(whereAnd)
    span?.setAttribute('project.list.count', projects.length)
    this.logger.debug(`project.list completed (requestorUserId=${user.userId}, filter=${filter}, count=${projects.length})`)

    return projects
  }

  @StartActiveSpan()
  async get(projectId: string) {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.id', projectId)
    this.logger.debug(`project.get started (projectId=${projectId})`)
    const project = await this.getProjectNotArchived(projectId)
    if (!project) {
      this.logger.warn(`project.get notFound (projectId=${projectId})`)
      throw new NotFoundException('Projet introuvable')
    }
    this.logger.debug(`project.get completed (projectId=${projectId})`)
    return project
  }

  @StartActiveSpan()
  async create(
    body: typeof projectContract.createProject.body._type,
    requestorUserId: string,
    requestId?: string,
  ): Promise<ProjectWithDetails> {
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
      await this.logProjectAction(
        'Create Project',
        project,
        `Projet créé: ${project.slug} (${project.roles.length} rôles)`,
        requestorUserId,
        requestId,
      )
      await Promise.all(project.roles.map(async role => this.logProjectRoleAction(
        'Upsert Project Role',
        project,
        role.id,
        `Rôle synchronisé: ${role.name}`,
        requestorUserId,
        requestId,
      )))
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
    requestId?: string,
  ): Promise<ProjectWithDetails> {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.id', projectId)
    span?.setAttribute('user.id', user.userId)
    this.logger.log(`project.update started (projectId=${projectId}, requestorUserId=${user.userId})`)
    try {
      const project = await this.prisma.$transaction(async (tx) => {
        const projectDb = await getNotArchivedProjectForUpdate(tx, projectId)
        if (!projectDb) throw new NotFoundException('Projet introuvable')

        const { effectiveData, strippedKeys } = this.stripProjectUpdateBody(body, user, projectDb)
        this.logProjectUpdateStrippedFields(span, projectId, user.userId, strippedKeys)
        if (projectDb.locked && effectiveData.locked !== false) {
          throw new ForbiddenException('Veuillez déverrouiller le projet pour le mettre à jour')
        }

        await this.updateProjectOwnerIfNeeded(tx, projectDb, effectiveData, projectId, user.userId)

        const updateData = parseProjectUpdateInput(effectiveData)
        const effectiveKeys = Object.keys(effectiveData)
        span?.setAttribute('project.update.effectiveKeys.count', effectiveKeys.length)
        await updateProject(tx, projectId, updateData)

        const updated = await getProject(tx, projectId)
        if (!updated) throw new NotFoundException('Projet introuvable')
        this.logger.log(`project.update dbUpdated (projectId=${projectId}, requestorUserId=${user.userId}, effectiveKeys=${effectiveKeys.join(',')})`)
        return updated
      })
      await this.eventEmitter.emitAsync('project.upsert', project)
      await this.logProjectAction(
        'Update Project',
        project,
        `Projet mis à jour: ${project.slug}`,
        user.userId,
        requestId,
      )
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
  async archive(projectId: string, requestorUserId?: string, requestId?: string): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.id', projectId)
    this.logger.log(`project.archive started (projectId=${projectId})`)
    try {
      const project = await this.prisma.$transaction(async (tx) => {
        const loaded = await getProject(tx, projectId)
        if (!loaded) throw new NotFoundException('Projet introuvable')

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
      await this.logProjectAction(
        'Delete all project resources',
        project,
        `Projet archivé: ${project.slug}`,
        requestorUserId,
        requestId,
      )
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

  private async logProjectAction(
    action: string,
    project: ProjectWithDetails,
    messageResume: string,
    userId: string | undefined,
    requestId: string | undefined,
  ): Promise<void> {
    await this.logs.addLog({
      action,
      data: {
        args: { projectId: project.id },
        messageResume,
        results: { projectId: project.id, slug: project.slug },
      },
      userId,
      requestId,
      projectId: project.id,
    })
  }

  private async logProjectRoleAction(
    action: string,
    project: ProjectWithDetails,
    roleId: string,
    messageResume: string,
    userId: string | undefined,
    requestId: string | undefined,
  ): Promise<void> {
    await this.logs.addLog({
      action,
      data: {
        args: { projectId: project.id, roleId },
        messageResume,
        results: { projectId: project.id, roleId },
      },
      userId,
      requestId,
      projectId: project.id,
    })
  }

  private async listProjectsForDataExport(): Promise<ProjectDataExport[]> {
    return this.prisma.project.findMany({
      select: projectForDataSelect,
      where: { suspended: false },
    })
  }

  private async fetchProjects(whereAnd: Prisma.ProjectWhereInput[]): Promise<ProjectWithDetails[]> {
    return this.prisma.project.findMany({
      where: { AND: [...whereAnd, { suspended: false }] },
      select: projectSelect,
    })
  }

  private async getProjectNotArchived(projectId: string): Promise<ProjectWithDetails | null> {
    return this.prisma.project.findFirst({
      where: { id: projectId, status: { not: 'archived' } },
      select: projectSelect,
    })
  }

  private stripProjectUpdateBody(
    body: typeof projectContract.updateProject.body._type,
    user: UserContext,
    project: ProjectUpdateContext,
  ): { effectiveData: Record<string, unknown>, strippedKeys: string[] } {
    const isOwner = project.ownerId === user.userId
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

    return { effectiveData, strippedKeys }
  }

  private logProjectUpdateStrippedFields(
    span: ReturnType<typeof trace.getActiveSpan>,
    projectId: string,
    requestorUserId: string,
    strippedKeys: string[],
  ): void {
    if (!strippedKeys.length) return

    span?.setAttribute('project.update.strippedKeys.count', strippedKeys.length)
    this.logger.debug(`project.update strippedFields (projectId=${projectId}, requestorUserId=${requestorUserId}, strippedKeys=${strippedKeys.join(',')})`)
  }

  private async updateProjectOwnerIfNeeded(
    tx: Prisma.TransactionClient,
    project: ProjectUpdateContext,
    effectiveData: Record<string, unknown>,
    projectId: string,
    requestorUserId: string,
  ): Promise<void> {
    const ownerIdCandidate = effectiveData.ownerId as string | undefined
    if (!ownerIdCandidate || ownerIdCandidate === project.ownerId) return

    this.logger.log(`project.update ownerChange started (projectId=${projectId}, requestorUserId=${requestorUserId}, previousOwnerId=${project.ownerId}, nextOwnerId=${ownerIdCandidate})`)

    const memberCandidate = project.members.find(member => member.userId === ownerIdCandidate)
    if (!memberCandidate) {
      throw new BadRequestException('Le nouveau propriétaire doit faire partie des membres actuels du projet')
    }
    if (memberCandidate.user.type !== 'human') {
      throw new BadRequestException('Seuls les comptes humains peuvent être propriétaire de projets')
    }

    const oldOwnerIsMember = project.members.some(member => member.userId === project.ownerId)
    if (!oldOwnerIsMember) {
      await createProjectMember(tx, project.id, project.ownerId)
    }

    await deleteProjectMember(tx, project.id, ownerIdCandidate)
    await updateProject(tx, project.id, { owner: { connect: { id: ownerIdCandidate } } })

    this.logger.log(`project.update ownerChange completed (projectId=${projectId}, requestorUserId=${requestorUserId}, previousOwnerId=${project.ownerId}, nextOwnerId=${ownerIdCandidate})`)
  }
}
