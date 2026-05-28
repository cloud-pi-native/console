import type { CreateProjectBody, projectContract, projectMemberContract, ProjectV2 } from '@cpn-console/shared'
import type { ProjectContext } from '../infrastructure/auth/project.guard'
import { AdminAuthorized, ProjectStatusSchema } from '@cpn-console/shared'
import { BadRequestException, ForbiddenException, Inject, Injectable, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
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

  async getProject(project: ProjectContext): Promise<ProjectV2> {
    if (project.status === 'archived') throw new NotFoundException()

    const projectWithDetails = await this.projectDatastore.getProjectWithDetails(project.id)
    if (!projectWithDetails) throw new NotFoundException()

    return generateProjectV2(projectWithDetails)
  }

  async updateProject(
    data: typeof projectContract.updateProject.body._type,
    project: ProjectContext,
    requestorUserId: string,
    adminPermissions: bigint,
  ): Promise<ProjectV2> {
    const isAdmin = AdminAuthorized.Manage(adminPermissions)
    const isOwner = project.ownerId === requestorUserId

    const effectiveData = { ...data }
    if (!isAdmin) {
      delete (effectiveData as any).locked
      if (!isOwner) {
        delete (effectiveData as any).ownerId
      }
    }

    if (project.locked && (effectiveData as any).locked !== false) {
      throw new ForbiddenException('Veuillez déverrouiller le projet pour le mettre à jour')
    }

    await this.prisma.$transaction(async (tx) => {
      const projectDb = await tx.project.findUniqueOrThrow({
        where: { id: project.id },
        include: { members: { include: { user: true } } },
      })

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
          await tx.projectMembers.create({ data: { userId: projectDb.ownerId, projectId: project.id } })
        }
        await tx.projectMembers.delete({
          where: { projectId_userId: { userId: ownerIdCandidate, projectId: project.id } },
        })
        await tx.project.update({ where: { id: project.id }, data: { ownerId: ownerIdCandidate } })
      }

      const updateData: any = {}
      if (effectiveData.description !== undefined) updateData.description = effectiveData.description
      if (effectiveData.locked !== undefined) updateData.locked = effectiveData.locked
      if (effectiveData.limitless !== undefined) updateData.limitless = effectiveData.limitless
      if (effectiveData.hprodCpu !== undefined) updateData.hprodCpu = effectiveData.hprodCpu
      if (effectiveData.hprodGpu !== undefined) updateData.hprodGpu = effectiveData.hprodGpu
      if (effectiveData.hprodMemory !== undefined) updateData.hprodMemory = effectiveData.hprodMemory
      if (effectiveData.prodCpu !== undefined) updateData.prodCpu = effectiveData.prodCpu
      if (effectiveData.prodGpu !== undefined) updateData.prodGpu = effectiveData.prodGpu
      if (effectiveData.prodMemory !== undefined) updateData.prodMemory = effectiveData.prodMemory
      if (effectiveData.everyonePerms !== undefined) updateData.everyonePerms = BigInt(effectiveData.everyonePerms)

      if (Object.keys(updateData).length) {
        await tx.project.update({ where: { id: project.id }, data: updateData })
      }
    })

    const projectWithDetails = await this.projectDatastore.getProjectWithDetails(project.id)
    if (!projectWithDetails) throw new NotFoundException()

    try {
      await this.eventEmitter.emitAsync('project.upsert', projectWithDetails)
    } catch {
      throw new UnprocessableEntityException('Echec des services à la mise à jour du projet')
    }

    return generateProjectV2(projectWithDetails)
  }

  async replayHooksForProject(projectId: string): Promise<void> {
    const project = await this.projectDatastore.getProjectWithDetails(projectId)
    if (!project) throw new NotFoundException()

    try {
      await this.eventEmitter.emitAsync('project.upsert', project)
    } catch {
      throw new UnprocessableEntityException('Echec des services au reprovisionnement du projet')
    }
  }

  async archiveProject(projectId: string): Promise<void> {
    const project = await this.projectDatastore.getProjectWithDetails(projectId)
    if (!project) throw new NotFoundException()

    await Promise.all([
      this.prisma.repository.deleteMany({ where: { projectId } }),
      this.prisma.environment.deleteMany({ where: { projectId } }),
      this.prisma.deployment.deleteMany({ where: { projectId } }),
    ])

    try {
      await this.eventEmitter.emitAsync('project.delete', project)
    } catch {
      throw new UnprocessableEntityException('Echec des services à la suppression du projet')
    }

    const archivedSuffix = `${Date.now()}_archived`
    await this.prisma.project.update({
      where: { id: projectId },
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
        return () => this.archiveProject(projectId)
      }
      if (data.action === 'lock' || data.action === 'unlock') {
        return () => this.prisma.project.update({
          where: { id: projectId },
          data: { locked: data.action === 'lock' },
        }).then(() => undefined)
      }
      if (data.action === 'replay') {
        return () => this.replayHooksForProject(projectId)
      }
      return async () => undefined
    })

    await runWithConcurrency(tasks, 5)
  }

  async getProjectSecrets(projectId: string): Promise<Record<string, Record<string, string>>> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { slug: true } })
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

  async listMembers(projectId: string) {
    const members = await this.prisma.projectMembers.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    return members.map(({ roleIds, user: { id: userId, ...user } }) => ({
      userId,
      roleIds,
      ...user,
    }))
  }

  async addMember(
    projectId: string,
    body: typeof projectMemberContract.addMember.body._type,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    })
    if (!project) throw new NotFoundException()

    const userId = 'userId' in body ? body.userId : undefined
    const email = 'email' in body ? body.email : undefined

    const userInDb = await this.prisma.user.findFirst({
      where: {
        ...(userId ? { id: userId } : {}),
        ...(email ? { email } : {}),
        type: 'human',
      },
    })

    if (!userInDb) {
      if (email) {
        throw new BadRequestException('Utilisateur introuvable (la recherche par email nécessite le hook Keycloak, non disponible dans cette version)')
      }
      throw new NotFoundException('Utilisateur introuvable')
    }

    if (userInDb.id === project.ownerId) {
      throw new BadRequestException('Le owner ne peut pas être ajouté à cette liste')
    }

    await this.prisma.projectMembers.upsert({
      where: { projectId_userId: { projectId, userId: userInDb.id } },
      create: { projectId, userId: userInDb.id, roleIds: [] },
      update: {},
    })

    await this.eventEmitter.emitAsync('projectMember.upsert', { projectId, userId: userInDb.id })

    return this.listMembers(projectId)
  }

  async patchMembers(
    projectId: string,
    body: typeof projectMemberContract.patchMembers.body._type,
  ) {
    await this.prisma.$transaction(async (tx) => {
      for (const member of body) {
        await tx.projectMembers.upsert({
          where: { projectId_userId: { projectId, userId: member.userId } },
          create: { projectId, userId: member.userId, roleIds: member.roles },
          update: { roleIds: member.roles },
        })
      }
    })

    for (const member of body) {
      await this.eventEmitter.emitAsync('projectMember.upsert', { projectId, userId: member.userId })
    }

    return this.listMembers(projectId)
  }

  async removeMember(
    projectId: string,
    userId: string,
  ) {
    await this.prisma.projectMembers.delete({
      where: { projectId_userId: { projectId, userId } },
    })

    await this.eventEmitter.emitAsync('projectMember.delete', { projectId, userId })

    return this.listMembers(projectId)
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
