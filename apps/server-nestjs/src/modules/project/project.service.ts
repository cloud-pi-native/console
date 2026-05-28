import type { CreateProjectBody, projectContract, ProjectV2 } from '@cpn-console/shared'
import { AdminAuthorized, PROJECT_PERMS, ProjectAuthorized, ProjectStatusSchema } from '@cpn-console/shared'
import { BadRequestException, ForbiddenException, Inject, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { json2csv } from 'json-2-csv'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { VaultClientService } from '../vault/vault-client.service'
import { VaultService } from '../vault/vault.service'
import { generateProjectPath } from '../vault/vault.utils'
import { ProjectDatastoreService, projectSelect } from './project-datastore.service'
import { generateProjectCreateInput, generateProjectV2, generateSlug } from './project.utils'

@Injectable()
export class ProjectService {
  constructor(
    @Inject(ProjectDatastoreService) private readonly projectDatastore: ProjectDatastoreService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
    @Inject(VaultService) private readonly vault: VaultService,
    @Inject(VaultClientService) private readonly vaultClient: VaultClientService,
  ) {}

  async getProjectWithDetails(projectId: string) {
    const projectWithDetails = await this.projectDatastore.getProjectWithDetails(projectId)
    if (!projectWithDetails) throw new NotFoundException()
    return projectWithDetails
  }

  async createProject(data: CreateProjectBody, requestorUserId: string): Promise<ProjectV2> {
    const prefix = data.name

    const project = await this.prisma.$transaction(async (tx) => {
      const existingSlugs = await tx.project.findMany({
        where: { slug: { startsWith: prefix } },
        select: { slug: true },
      })
      const slug = generateSlug(prefix, existingSlugs.map(s => s.slug))

      const created = await tx.project.create({
        data: generateProjectCreateInput(data, requestorUserId, slug),
        select: { id: true },
      })

      const projectWithDetails = await tx.project.findUnique({
        where: { id: created.id },
        select: projectSelect,
      })

      if (!projectWithDetails) {
        throw new InternalServerErrorException('Project created but cannot be loaded')
      }

      return projectWithDetails
    })

    try {
      await this.eventEmitter.emitAsync('project.upsert', project)
    } catch {
      throw new UnprocessableEntityException('Echec des services à la création du projet')
    }

    return generateProjectV2(project)
  }

  async listProjects(
    query: typeof projectContract.listProjects.query._type,
    requestorUserId: string,
    adminPermissions: bigint,
  ): Promise<ProjectV2[]> {
    const projectStatus = ProjectStatusSchema.options
    const { status, statusIn, statusNotIn, filter = 'member', ...rest } = query

    if (filter === 'all' && !AdminAuthorized.Manage(adminPermissions)) {
      throw new ForbiddenException('Seuls les admins avec les droits de visionnage des projets peuvent utiliser le filtre \'all\'')
    }

    const whereAnd: any[] = []
    if (rest.id) whereAnd.push({ id: rest.id })
    if (typeof rest.locked !== 'undefined') whereAnd.push({ locked: rest.locked })
    if (rest.name) whereAnd.push({ name: rest.name })
    if (rest.description) whereAnd.push({ description: { contains: rest.description } })

    const statusWhere = whereBuilder({
      enumValues: projectStatus,
      eqValue: status,
      inValues: statusIn,
      notInValues: statusNotIn,
    })
    if (statusWhere) whereAnd.push({ status: statusWhere })

    if (rest.lastSuccessProvisionningVersion) {
      if (rest.lastSuccessProvisionningVersion === 'outdated') {
        whereAnd.push({ lastSuccessProvisionningVersion: { not: this.config.appVersion } })
      } else if (rest.lastSuccessProvisionningVersion === 'last') {
        whereAnd.push({ lastSuccessProvisionningVersion: { equals: this.config.appVersion } })
      } else {
        whereAnd.push({ lastSuccessProvisionningVersion: rest.lastSuccessProvisionningVersion })
      }
    }

    if (rest.search) {
      whereAnd.push({
        OR: [
          { name: { contains: rest.search } },
          { owner: { email: { contains: rest.search } } },
        ],
      })
    }

    if (filter === 'owned') {
      whereAnd.push({ ownerId: requestorUserId })
    } else if (filter === 'member') {
      whereAnd.push({
        OR: [
          { members: { some: { userId: requestorUserId } } },
          { ownerId: requestorUserId },
        ],
      })
    }

    const projects = await this.prisma.project.findMany({
      where: { AND: whereAnd },
      select: projectSelect,
    })

    return projects.map(generateProjectV2)
  }

  async getProject(projectIdOrSlug: string, requestorUserId: string, adminPermissions: bigint): Promise<ProjectV2> {
    const state = await this.getProjectPermissionState(projectIdOrSlug, requestorUserId)
    if (state.status === 'archived') {
      throw new NotFoundException()
    }
    if (!state.permissions && !AdminAuthorized.Manage(adminPermissions)) {
      throw new ForbiddenException()
    }

    const project = await this.projectDatastore.getProjectWithDetails(state.id)
    if (!project) throw new NotFoundException()

    return generateProjectV2(project)
  }

  async updateProject(
    data: typeof projectContract.updateProject.body._type,
    projectIdOrSlug: string,
    requestorUserId: string,
    adminPermissions: bigint,
  ): Promise<ProjectV2> {
    const requestor = await this.prisma.user.findUnique({ where: { id: requestorUserId }, select: { id: true } })
    if (!requestor) throw new UnauthorizedException('Cannot find requestor in database')

    const state = await this.getProjectPermissionState(projectIdOrSlug, requestorUserId)
    if (!ProjectAuthorized.Manage({ adminPermissions, projectPermissions: state.permissions })) {
      throw new ForbiddenException()
    }

    const isAdmin = AdminAuthorized.Manage(adminPermissions)
    const isOwner = state.ownerId === requestorUserId

    const effectiveData = { ...data }
    if (!isAdmin) {
      delete (effectiveData as any).locked
      if (!isOwner) {
        delete (effectiveData as any).ownerId
      }
    }

    if (state.locked) {
      if (!isAdmin) throw new ForbiddenException('Le projet est verrouillé')
      if (effectiveData.locked !== false) throw new ForbiddenException('Veuillez déverrouiler le projet pour le mettre à jour')
    }

    await this.prisma.$transaction(async (tx) => {
      const projectDb = await tx.project.findUniqueOrThrow({
        where: { id: state.id },
        include: { members: { include: { user: true } } },
      })

      if (projectDb.status === 'archived') {
        throw new ForbiddenException('Le projet est archivé')
      }

      const ownerIdCandidate = effectiveData.ownerId
      if (ownerIdCandidate && ownerIdCandidate !== projectDb.ownerId) {
        const memberCandidate = projectDb.members.find(member => member.userId === ownerIdCandidate)
        if (!memberCandidate) {
          throw new BadRequestException('Le nouveau propriétaire doit faire partie des membres actuels du projet')
        }
        if (memberCandidate.user.type !== 'human') {
          throw new BadRequestException('Seuls les comptes humains peuvent être propriétaire de projets')
        }

        const oldOwnerIsMember = projectDb.members.some(member => member.userId === projectDb.ownerId)
        if (!oldOwnerIsMember) {
          await tx.projectMembers.create({ data: { userId: projectDb.ownerId, projectId: state.id } })
        }
        await tx.projectMembers.delete({
          where: { projectId_userId: { userId: ownerIdCandidate, projectId: state.id } },
        })
        await tx.project.update({ where: { id: state.id }, data: { ownerId: ownerIdCandidate } })
      }

      const updateData: any = {}
      if (typeof effectiveData.description !== 'undefined') updateData.description = effectiveData.description
      if (typeof effectiveData.locked !== 'undefined') updateData.locked = effectiveData.locked
      if (typeof effectiveData.limitless !== 'undefined') updateData.limitless = effectiveData.limitless
      if (typeof effectiveData.hprodCpu !== 'undefined') updateData.hprodCpu = effectiveData.hprodCpu
      if (typeof effectiveData.hprodGpu !== 'undefined') updateData.hprodGpu = effectiveData.hprodGpu
      if (typeof effectiveData.hprodMemory !== 'undefined') updateData.hprodMemory = effectiveData.hprodMemory
      if (typeof effectiveData.prodCpu !== 'undefined') updateData.prodCpu = effectiveData.prodCpu
      if (typeof effectiveData.prodGpu !== 'undefined') updateData.prodGpu = effectiveData.prodGpu
      if (typeof effectiveData.prodMemory !== 'undefined') updateData.prodMemory = effectiveData.prodMemory
      if (typeof effectiveData.everyonePerms !== 'undefined') updateData.everyonePerms = BigInt(effectiveData.everyonePerms)

      if (Object.keys(updateData).length) {
        await tx.project.update({ where: { id: state.id }, data: updateData })
      }
    })

    const project = await this.projectDatastore.getProjectWithDetails(state.id)
    if (!project) throw new NotFoundException()

    try {
      await this.eventEmitter.emitAsync('project.upsert', project)
    } catch {
      throw new UnprocessableEntityException('Echec des services à la mise à jour du projet')
    }

    return generateProjectV2(project)
  }

  async replayHooksForProject(projectIdOrSlug: string, requestorUserId: string, adminPermissions: bigint): Promise<void> {
    const state = await this.getProjectPermissionState(projectIdOrSlug, requestorUserId)
    if (!ProjectAuthorized.ReplayHooks({ adminPermissions, projectPermissions: state.permissions })) {
      throw new ForbiddenException()
    }
    if (state.locked) throw new ForbiddenException('Le projet est verrouillé')
    if (state.status === 'archived') throw new ForbiddenException('Le projet est archivé')

    const project = await this.projectDatastore.getProjectWithDetails(state.id)
    if (!project) throw new NotFoundException()

    try {
      await this.eventEmitter.emitAsync('project.upsert', project)
    } catch {
      throw new UnprocessableEntityException('Echec des services au reprovisionnement du projet')
    }
  }

  async archiveProject(projectIdOrSlug: string, requestorUserId: string, adminPermissions: bigint): Promise<void> {
    const requestor = await this.prisma.user.findUnique({ where: { id: requestorUserId }, select: { id: true } })
    if (!requestor) throw new UnauthorizedException('Cannot find requestor in database')

    const state = await this.getProjectPermissionState(projectIdOrSlug, requestorUserId)
    if (!ProjectAuthorized.Manage({ adminPermissions, projectPermissions: state.permissions })) {
      throw new ForbiddenException()
    }
    if (state.locked) throw new ForbiddenException('Le projet est verrouillé')
    if (state.status === 'archived') throw new BadRequestException('Le projet est archivé')

    const project = await this.projectDatastore.getProjectWithDetails(state.id)
    if (!project) throw new NotFoundException()

    await Promise.all([
      this.prisma.repository.deleteMany({ where: { projectId: state.id } }),
      this.prisma.environment.deleteMany({ where: { projectId: state.id } }),
      this.prisma.deployment.deleteMany({ where: { projectId: state.id } }),
    ])

    try {
      await this.eventEmitter.emitAsync('project.delete', project)
    } catch {
      throw new UnprocessableEntityException('Echec des services à la suppression du projet')
    }

    const archivedSuffix = `${Date.now()}_archived`
    await this.prisma.project.update({
      where: { id: state.id },
      data: {
        name: `${project.name}_${archivedSuffix}`,
        slug: `${project.slug}_${archivedSuffix}`,
        status: 'archived',
        locked: true,
        clusters: { set: [] },
      },
    })
  }

  async getProjectsData(adminPermissions: bigint): Promise<string> {
    if (!AdminAuthorized.Manage(adminPermissions)) {
      throw new ForbiddenException()
    }

    const projects = await this.prisma.project.findMany({
      select: {
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        environments: {
          select: {
            name: true,
            stage: true,
            cluster: {
              select: { label: true },
            },
          },
        },
        owner: true,
      },
    })

    return json2csv(projects, { emptyFieldValue: '' })
  }

  async bulkActionProject(
    data: typeof projectContract.bulkActionProject.body._type,
    requestorUserId: string,
    adminPermissions: bigint,
  ): Promise<void> {
    const requestor = await this.prisma.user.findUnique({ where: { id: requestorUserId }, select: { id: true } })
    if (!requestor) throw new UnauthorizedException('Cannot find requestor in database')
    if (!AdminAuthorized.Manage(adminPermissions)) throw new ForbiddenException()

    let projectIds = data.projectIds
    if (projectIds === 'all') {
      projectIds = (await this.prisma.project.findMany({
        select: { id: true },
        where: { status: { not: 'archived' } },
      })).map(({ id }) => id)
    }

    const tasks = projectIds.map((projectId) => {
      if (data.action === 'archive') {
        return () => this.archiveProject(projectId, requestorUserId, adminPermissions)
      }
      if (data.action === 'lock') {
        return () => this.updateProject({ locked: true } as any, projectId, requestorUserId, adminPermissions).then(() => undefined)
      }
      if (data.action === 'unlock') {
        return () => this.updateProject({ locked: false } as any, projectId, requestorUserId, adminPermissions).then(() => undefined)
      }
      if (data.action === 'replay') {
        return () => this.replayHooksForProject(projectId, requestorUserId, adminPermissions)
      }
      return async () => undefined
    })

    await runWithConcurrency(tasks, 5)
  }

  async getProjectSecrets(projectIdOrSlug: string, requestorUserId: string, adminPermissions: bigint): Promise<Record<string, Record<string, string>>> {
    const state = await this.getProjectPermissionState(projectIdOrSlug, requestorUserId)
    if (!ProjectAuthorized.SeeSecrets({ adminPermissions, projectPermissions: state.permissions })) {
      throw new ForbiddenException()
    }
    if (state.status === 'archived') throw new ForbiddenException('Le projet est archivé')

    const project = await this.prisma.project.findUnique({ where: { id: state.id }, select: { slug: true } })
    if (!project) throw new NotFoundException()

    const relativePaths = await this.vault.listProjectSecrets(project.slug)
    const projectPath = generateProjectPath(this.config.projectRootDir, project.slug)

    const result: Record<string, Record<string, string>> = {}

    for (const relativePath of relativePaths) {
      const fullPath = `${projectPath}/${relativePath}`
      const secret = await this.vaultClient.read<Record<string, any>>(fullPath).catch(() => null)
      if (!secret?.data) continue

      const [group, ...rest] = relativePath.split('/').filter(Boolean)
      if (!group) continue
      const prefix = rest.length ? `${rest.join('/')}.` : ''

      const groupObj = (result[group] ??= {})
      for (const [key, value] of Object.entries(secret.data)) {
        if (typeof value === 'string') {
          groupObj[`${prefix}${key}`] = value
        } else if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') {
          groupObj[`${prefix}${key}`] = String(value)
        } else if (value === null || value === undefined) {
          groupObj[`${prefix}${key}`] = ''
        } else {
          groupObj[`${prefix}${key}`] = JSON.stringify(value)
        }
      }
    }

    return result
  }

  private async getProjectPermissionState(projectIdOrSlug: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: isUuid(projectIdOrSlug) ? { id: projectIdOrSlug } : { slug: projectIdOrSlug },
      select: {
        id: true,
        ownerId: true,
        locked: true,
        status: true,
        everyonePerms: true,
        roles: { select: { id: true, permissions: true } },
        members: { select: { userId: true, roleIds: true } },
      },
    })
    if (!project) throw new NotFoundException()

    if (project.ownerId === userId) {
      return {
        id: project.id,
        locked: project.locked,
        status: project.status,
        ownerId: project.ownerId,
        permissions: PROJECT_PERMS.MANAGE,
      }
    }

    const member = project.members.find(m => m.userId === userId)
    if (!member) {
      return {
        id: project.id,
        locked: project.locked,
        status: project.status,
        ownerId: project.ownerId,
        permissions: undefined as bigint | undefined,
      }
    }

    const memberRoles = project.roles.filter(role => member.roleIds.includes(role.id))
    const permissions = memberRoles.reduce(
      (acc, curr) => acc | curr.permissions,
      project.everyonePerms | PROJECT_PERMS.GUEST,
    )

    return {
      id: project.id,
      locked: project.locked,
      status: project.status,
      ownerId: project.ownerId,
      permissions,
    }
  }
}

function whereBuilder<T extends readonly string[]>({
  enumValues,
  eqValue,
  inValues,
  notInValues,
}: {
  enumValues: T
  eqValue: T[number] | undefined
  inValues: string | undefined
  notInValues: string | undefined
}) {
  if (eqValue) {
    return eqValue
  }
  if (inValues) {
    return { in: splitStringsFilterArray(enumValues, inValues) }
  }
  if (notInValues) {
    return { notIn: splitStringsFilterArray(enumValues, notInValues) }
  }
}

function splitStringsFilterArray<T extends readonly string[]>(toMatch: T, inputs: string): T {
  return inputs.split(',').filter(i => toMatch.includes(i)) as unknown as T
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

async function runWithConcurrency<T>(tasks: Array<() => Promise<T>>, limit: number) {
  const inFlight = new Set<Promise<void>>()

  async function runTask(task: () => Promise<T>) {
    try {
      await task()
    } catch {
    }
  }

  for (const task of tasks) {
    const p = runTask(task).then(() => {
      inFlight.delete(p)
    })
    inFlight.add(p)
    if (inFlight.size >= limit) {
      await Promise.race(inFlight)
    }
  }
  await Promise.all(inFlight)
}
