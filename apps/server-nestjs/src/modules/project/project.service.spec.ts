import type { TestingModule } from '@nestjs/testing'
import type { Prisma } from '@prisma/client'
import type { Mocked } from 'vitest'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import {
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { VaultClientService } from '../vault/vault-client.service'
import { VaultService } from '../vault/vault.service'
import { ProjectDatastoreService } from './project-datastore.service'
import {
  makeCreateProjectBody,
  makeListProjectsQuery,
  makeProject,
  makeProjectContext,
  makeProjectMembers,
  makeProjectMemberWithUser,
  makeProjectWithDetails,
  makeProjectWithMembersResult,
  makeUser,
  makeVaultSecret,
} from './project-testing.utils'
import { ProjectService } from './project.service'
import { generateSlug } from './project.utils'

describe('projectService', () => {
  let module: TestingModule
  let service: ProjectService
  let prisma: DeepMockProxy<PrismaService>
  let events: Mocked<EventEmitter2>
  let datastore: Mocked<ProjectDatastoreService>
  let vault: Mocked<VaultService>
  let vaultClient: Mocked<VaultClientService>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()

    module = await Test.createTestingModule({
      providers: [
        ProjectService,
        {
          provide: ProjectDatastoreService,
          useValue: {
            getProjectWithDetails: vi.fn(),
          } satisfies Partial<ProjectDatastoreService>,
        },
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: EventEmitter2,
          useValue: {
            emitAsync: vi.fn().mockResolvedValue([]),
          } satisfies Partial<EventEmitter2>,
        },
        {
          provide: ConfigurationService,
          useValue: {
            appVersion: 'dev',
            projectRootDir: '/vault',
          } satisfies Partial<ConfigurationService>,
        },
        {
          provide: VaultService,
          useValue: {
            listProjectSecrets: vi.fn(),
          } satisfies Partial<VaultService>,
        },
        {
          provide: VaultClientService,
          useValue: {
            read: vi.fn(),
          } satisfies Partial<VaultClientService>,
        },
      ],
    }).compile()

    service = module.get(ProjectService)
    prisma = module.get(PrismaService)
    events = module.get(EventEmitter2)
    datastore = module.get(ProjectDatastoreService)
    vault = module.get(VaultService)
    vaultClient = module.get(VaultClientService)
  })

  describe('createProject', () => {
    it('generates slug, creates project, emits event, returns ProjectV2', async () => {
      const userId = faker.string.uuid()
      const body = makeCreateProjectBody()
      const existingSlugs = [body.name, `${body.name}-1`]
      const expectedSlug = generateSlug(body.name, existingSlugs)
      const tx = mockDeep<Prisma.TransactionClient>()

      tx.project.findMany.mockResolvedValue(existingSlugs.map(slug => makeProject({ slug })))
      prisma.$transaction.mockImplementation(async cb => cb(tx))

      const pwd = makeProjectWithDetails({ slug: expectedSlug })
      tx.project.create.mockResolvedValue(makeProject({ id: pwd.id }))
      tx.project.findUnique.mockResolvedValue(pwd)

      const result = await service.createProject(body, userId)

      expect(tx.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: { startsWith: body.name } } }),
      )
      expect(tx.project.create).toHaveBeenCalled()
      expect(events.emitAsync).toHaveBeenCalledWith('project.upsert', expect.anything())
      expect(result).toBeDefined()
      expect(result.slug).toBe(expectedSlug)
    })

    it('throws InternalServerErrorException when project cannot be loaded after creation', async () => {
      const userId = faker.string.uuid()
      const body = makeCreateProjectBody()

      const tx = mockDeep<Prisma.TransactionClient>()
      tx.project.findMany.mockResolvedValue([])
      tx.project.create.mockResolvedValue(makeProject({ id: 'test-id' }))
      tx.project.findUnique.mockResolvedValue(null)
      prisma.$transaction.mockImplementation(async cb => cb(tx))

      await expect(service.createProject(body, userId))
        .rejects.toThrow(InternalServerErrorException)
    })
  })

  describe('listProjects', () => {
    it('returns projects filtered by member for non-admin', async () => {
      const userId = faker.string.uuid()
      const projects = [makeProjectWithDetails(), makeProjectWithDetails()]
      prisma.project.findMany.mockResolvedValue(projects)

      const result = await service.listProjects(
        makeListProjectsQuery(),
        userId,
        0n,
      )

      expect(prisma.project.findMany).toHaveBeenCalled()
      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('id')
      expect(result[0]).toHaveProperty('slug')
    })

    it('allows admin-only "all" filter for admin users', async () => {
      const userId = faker.string.uuid()
      const adminPerms = BigInt(2)
      prisma.project.findMany.mockResolvedValue([makeProjectWithDetails()])

      const result = await service.listProjects(
        makeListProjectsQuery({ filter: 'all' }),
        userId,
        adminPerms,
      )

      expect(prisma.project.findMany).toHaveBeenCalled()
      expect(result).toHaveLength(1)
    })

    it('forbids "all" filter for non-admin users', async () => {
      const userId = faker.string.uuid()

      await expect(
        service.listProjects(makeListProjectsQuery({ filter: 'all' }), userId, 0n),
      ).rejects.toThrow(ForbiddenException)
    })

    it('filters by status', async () => {
      const userId = faker.string.uuid()
      prisma.project.findMany.mockResolvedValue([])

      await service.listProjects(
        makeListProjectsQuery({ status: 'created' }),
        userId,
        0n,
      )

      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({ status: 'created' }),
            ]),
          }),
        }),
      )
    })

    it('filters by search term', async () => {
      const userId = faker.string.uuid()
      const search = 'myproject'
      prisma.project.findMany.mockResolvedValue([])

      await service.listProjects(
        makeListProjectsQuery({ search }),
        userId,
        0n,
      )

      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: [
                  { name: { contains: search } },
                  { owner: { email: { contains: search } } },
                ],
              }),
            ]),
          }),
        }),
      )
    })
  })

  describe('getProject', () => {
    it('returns ProjectV2 for non-archived project', async () => {
      const ctx = makeProjectContext({ status: 'created' })
      const pwd = makeProjectWithDetails({ id: ctx.id, status: 'created' })
      datastore.getProjectWithDetails.mockResolvedValue(pwd)

      const result = await service.getProject(ctx)

      expect(result).toBeDefined()
      expect(result.id).toBe(ctx.id)
      expect(result.status).toBe('created')
    })

    it('throws NotFoundException for archived project', async () => {
      const ctx = makeProjectContext({ status: 'archived' })

      await expect(service.getProject(ctx)).rejects.toThrow(NotFoundException)
      expect(datastore.getProjectWithDetails).not.toHaveBeenCalled()
    })

    it('throws NotFoundException when datastore returns null', async () => {
      const ctx = makeProjectContext({ status: 'created' })
      datastore.getProjectWithDetails.mockResolvedValue(null)

      await expect(service.getProject(ctx)).rejects.toThrow(NotFoundException)
    })
  })

  describe('updateProject', () => {
    it('updates description and returns updated project', async () => {
      const ctx = makeProjectContext({ status: 'created', locked: false })
      const requestorId = faker.string.uuid()
      const pwd = makeProjectWithDetails({ id: ctx.id })
      const updatedPwd = makeProjectWithDetails({ id: ctx.id, description: 'Updated desc' })

      const tx = mockDeep<Prisma.TransactionClient>()
      tx.project.findUniqueOrThrow.mockResolvedValue(pwd)
      prisma.$transaction.mockImplementation(async cb => cb(tx))
      datastore.getProjectWithDetails.mockResolvedValue(updatedPwd)

      const result = await service.updateProject(
        { description: 'Updated desc' },
        ctx,
        requestorId,
        0n,
      )

      expect(result.description).toBe('Updated desc')
      expect(events.emitAsync).toHaveBeenCalledWith('project.upsert', expect.anything())
    })

    it('strips locked field for non-admin', async () => {
      const ctx = makeProjectContext({ locked: false })
      const requestorId = faker.string.uuid()
      const pwd = makeProjectWithDetails({ id: ctx.id })

      const tx = mockDeep<Prisma.TransactionClient>()
      tx.project.findUniqueOrThrow.mockResolvedValue(pwd)
      prisma.$transaction.mockImplementation(async cb => cb(tx))
      datastore.getProjectWithDetails.mockResolvedValue(pwd)

      await service.updateProject(
        { locked: true },
        ctx,
        requestorId,
        0n,
      )

      expect(tx.project.update).not.toHaveBeenCalled()
    })

    it('allows admin to update locked field', async () => {
      const ctx = makeProjectContext({ locked: false })
      const requestorId = faker.string.uuid()
      const adminPerms = BigInt(2)
      const pwd = makeProjectWithDetails({ id: ctx.id })

      const tx = mockDeep<Prisma.TransactionClient>()
      tx.project.findUniqueOrThrow.mockResolvedValue(pwd)
      prisma.$transaction.mockImplementation(async cb => cb(tx))
      datastore.getProjectWithDetails.mockResolvedValue(pwd)

      await service.updateProject(
        { locked: true },
        ctx,
        requestorId,
        adminPerms,
      )

      expect(tx.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ctx.id },
          data: expect.objectContaining({ locked: true }),
        }),
      )
    })

    it('strips ownerId for non-owner non-admin', async () => {
      const ownerId = faker.string.uuid()
      const ctx = makeProjectContext({ locked: false, ownerId })
      const requestorId = faker.string.uuid()
      const pwd = makeProjectWithDetails({ id: ctx.id, ownerId })

      const tx = mockDeep<Prisma.TransactionClient>()
      tx.project.findUniqueOrThrow.mockResolvedValue(pwd)
      prisma.$transaction.mockImplementation(async cb => cb(tx))
      datastore.getProjectWithDetails.mockResolvedValue(pwd)

      await service.updateProject(
        { ownerId: faker.string.uuid() },
        ctx,
        requestorId,
        0n,
      )

      expect(tx.project.update).not.toHaveBeenCalled()
    })

    it('throws ForbiddenException when project is locked and not unlocking', async () => {
      const ctx = makeProjectContext({ locked: true })
      const requestorId = faker.string.uuid()

      await expect(
        service.updateProject(
          { description: 'test' },
          ctx,
          requestorId,
          0n,
        ),
      ).rejects.toThrow(ForbiddenException)
    })

    it('allows admin to unlock a locked project', async () => {
      const ctx = makeProjectContext({ locked: true })
      const requestorId = faker.string.uuid()
      const adminPerms = BigInt(2)
      const pwd = makeProjectWithDetails({ id: ctx.id, locked: true })

      const tx = mockDeep<Prisma.TransactionClient>()
      tx.project.findUniqueOrThrow.mockResolvedValue(pwd)
      prisma.$transaction.mockImplementation(async cb => cb(tx))
      datastore.getProjectWithDetails.mockResolvedValue(pwd)

      await service.updateProject(
        { locked: false },
        ctx,
        requestorId,
        adminPerms,
      )

      expect(tx.project.update).toHaveBeenCalled()
    })

    it('validates new owner is a member of the project', async () => {
      const ownerId = faker.string.uuid()
      const newOwnerId = faker.string.uuid()
      const ctx = makeProjectContext({ locked: false, ownerId })
      const requestorId = ownerId
      const pwd = makeProjectWithDetails({ id: ctx.id, ownerId })

      const tx = mockDeep<Prisma.TransactionClient>()
      tx.project.findUniqueOrThrow.mockResolvedValue(pwd)
      prisma.$transaction.mockImplementation(async cb => cb(tx))

      await expect(
        service.updateProject(
          { ownerId: newOwnerId },
          ctx,
          requestorId,
          0n,
        ),
      ).rejects.toThrow('Le nouveau propriétaire doit faire partie des membres actuels du projet')
    })

    it('validates new owner is a human account', async () => {
      const ownerId = faker.string.uuid()
      const newOwnerId = faker.string.uuid()
      const ctx = makeProjectContext({ locked: false, ownerId })
      const requestorId = ownerId
      const pwd = makeProjectWithDetails({ id: ctx.id, ownerId })

      const tx = mockDeep<Prisma.TransactionClient>()
      tx.project.findUniqueOrThrow.mockResolvedValue(
        makeProjectWithMembersResult(pwd, [makeProjectMemberWithUser(makeUser({ id: newOwnerId, type: 'bot' }))]),
      )
      prisma.$transaction.mockImplementation(async cb => cb(tx))

      await expect(
        service.updateProject(
          { ownerId: newOwnerId },
          ctx,
          requestorId,
          0n,
        ),
      ).rejects.toThrow('Seuls les comptes humains peuvent être propriétaire de projets')
    })

    it('transfers ownership correctly', async () => {
      const ownerId = faker.string.uuid()
      const newOwnerId = faker.string.uuid()
      const ctx = makeProjectContext({ locked: false, ownerId })
      const requestorId = ownerId
      const pwd = makeProjectWithDetails({ id: ctx.id, ownerId })

      const tx = mockDeep<Prisma.TransactionClient>()
      tx.project.findUniqueOrThrow.mockResolvedValue(
        makeProjectWithMembersResult(pwd, [makeProjectMemberWithUser(
          makeUser({ id: newOwnerId, type: 'human' }),
          { roleIds: [faker.string.uuid()] },
        )]),
      )
      prisma.$transaction.mockImplementation(async cb => cb(tx))
      datastore.getProjectWithDetails.mockResolvedValue(
        makeProjectWithDetails({ id: ctx.id, ownerId: newOwnerId }),
      )

      const result = await service.updateProject(
        { ownerId: newOwnerId },
        ctx,
        requestorId,
        0n,
      )

      expect(tx.projectMembers.delete).toHaveBeenCalledWith({
        where: { projectId_userId: { userId: newOwnerId, projectId: ctx.id } },
      })
      expect(tx.project.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { ownerId: newOwnerId } }),
      )
      expect(result).toBeDefined()
    })
  })

  describe('archiveProject', () => {
    it('deletes related data, emits event, renames and archives project', async () => {
      const projectId = faker.string.uuid()
      const pwd = makeProjectWithDetails({ id: projectId, name: 'myproject', slug: 'myproject' })
      datastore.getProjectWithDetails.mockResolvedValue(pwd)
      prisma.repository.deleteMany.mockResolvedValue({ count: 2 })
      prisma.environment.deleteMany.mockResolvedValue({ count: 3 })
      prisma.deployment.deleteMany.mockResolvedValue({ count: 1 })
      prisma.project.update.mockResolvedValue(makeProject({ id: projectId }))

      await service.archiveProject(projectId)

      expect(prisma.repository.deleteMany).toHaveBeenCalledWith({ where: { projectId } })
      expect(prisma.environment.deleteMany).toHaveBeenCalledWith({ where: { projectId } })
      expect(prisma.deployment.deleteMany).toHaveBeenCalledWith({ where: { projectId } })
      expect(events.emitAsync).toHaveBeenCalledWith('project.delete', pwd)
      expect(prisma.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: projectId },
          data: expect.objectContaining({
            status: 'archived',
            locked: true,
            clusters: { set: [] },
          }),
        }),
      )
    })

    it('throws NotFoundException when project does not exist', async () => {
      datastore.getProjectWithDetails.mockResolvedValue(null)

      await expect(service.archiveProject(faker.string.uuid()))
        .rejects.toThrow(NotFoundException)
    })
  })

  describe('replayHooksForProject', () => {
    it('emits project.upsert event', async () => {
      const projectId = faker.string.uuid()
      const pwd = makeProjectWithDetails({ id: projectId })
      datastore.getProjectWithDetails.mockResolvedValue(pwd)

      await service.replayHooksForProject(projectId)

      expect(datastore.getProjectWithDetails).toHaveBeenCalledWith(projectId)
      expect(events.emitAsync).toHaveBeenCalledWith('project.upsert', pwd)
    })

    it('throws NotFoundException when project does not exist', async () => {
      datastore.getProjectWithDetails.mockResolvedValue(null)

      await expect(service.replayHooksForProject(faker.string.uuid()))
        .rejects.toThrow(NotFoundException)
    })
  })

  describe('getProjectSecrets', () => {
    it('returns parsed secrets from vault', async () => {
      const projectId = faker.string.uuid()
      const slug = 'myproject'
      prisma.project.findUnique.mockResolvedValue(makeProject({ slug }))
      vault.listProjectSecrets.mockResolvedValue(['group1/secret1'])
      vaultClient.read.mockResolvedValue(makeVaultSecret({ data: { key1: 'value1', key2: 42, key3: true, key4: null } }))

      const result = await service.getProjectSecrets(projectId)

      expect(prisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: projectId },
        select: { slug: true },
      })
      expect(vault.listProjectSecrets).toHaveBeenCalledWith(slug)
      expect(result).toHaveProperty('group1')
      expect(result.group1).toHaveProperty('secret1.key1', 'value1')
      expect(result.group1).toHaveProperty('secret1.key2', '42')
      expect(result.group1).toHaveProperty('secret1.key3', 'true')
      expect(result.group1).toHaveProperty('secret1.key4', '')
    })

    it('handles nested secret paths', async () => {
      const projectId = faker.string.uuid()
      prisma.project.findUnique.mockResolvedValue(makeProject({ slug: 'myproj' }))
      vault.listProjectSecrets.mockResolvedValue(['group1/sub/path'])
      vaultClient.read.mockResolvedValue(makeVaultSecret({ data: { nested: 'value' } }))

      const result = await service.getProjectSecrets(projectId)

      expect(result.group1).toHaveProperty('sub/path.nested', 'value')
    })

    it('throws NotFoundException when project does not exist', async () => {
      prisma.project.findUnique.mockResolvedValue(null)

      await expect(service.getProjectSecrets(faker.string.uuid()))
        .rejects.toThrow(NotFoundException)
    })

    it('returns empty object when no secrets exist', async () => {
      const projectId = faker.string.uuid()
      prisma.project.findUnique.mockResolvedValue(makeProject({ slug: 'myproj' }))
      vault.listProjectSecrets.mockResolvedValue([])

      const result = await service.getProjectSecrets(projectId)

      expect(result).toEqual({})
    })

    it('skips secrets that fail to read', async () => {
      const projectId = faker.string.uuid()
      prisma.project.findUnique.mockResolvedValue(makeProject({ slug: 'myproj' }))
      vault.listProjectSecrets.mockResolvedValue(['group1/s1', 'group1/s2'])
      vaultClient.read
        .mockRejectedValueOnce(new Error('vault error'))
        .mockResolvedValueOnce(makeVaultSecret({ data: { key: 'val' } }))

      const result = await service.getProjectSecrets(projectId)

      expect(result.group1).toEqual({ 's2.key': 'val' })
    })
  })

  describe('listMembers', () => {
    it('returns mapped members', async () => {
      const projectId = faker.string.uuid()
      const user1 = makeUser()
      const user2 = makeUser()
      prisma.projectMembers.findMany.mockResolvedValue([
        makeProjectMemberWithUser(user1, { roleIds: [faker.string.uuid()] }),
        makeProjectMemberWithUser(user2),
      ])

      const result = await service.listMembers(projectId)

      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('userId')
      expect(result[0]).toHaveProperty('roleIds')
      expect(result[0]).toHaveProperty('email')
      expect(result[0].userId).toBe(user1.id)
    })

    it('returns empty array when no members', async () => {
      const projectId = faker.string.uuid()
      prisma.projectMembers.findMany.mockResolvedValue([])

      const result = await service.listMembers(projectId)

      expect(result).toEqual([])
    })
  })

  describe('addMember', () => {
    it('adds member by userId and returns updated member list', async () => {
      const projectId = faker.string.uuid()
      const ownerId = faker.string.uuid()
      const newUserId = faker.string.uuid()
      const body = { userId: newUserId }

      prisma.project.findUnique.mockResolvedValue(makeProject({ ownerId }))
      prisma.user.findFirst.mockResolvedValue(makeUser({ id: newUserId }))
      prisma.projectMembers.upsert.mockResolvedValue(makeProjectMembers({ projectId, userId: newUserId }))
      const memberUser = makeUser()
      prisma.projectMembers.findMany.mockResolvedValue([makeProjectMemberWithUser(memberUser)])

      const result = await service.addMember(projectId, body)

      expect(prisma.projectMembers.upsert).toHaveBeenCalledWith({
        where: { projectId_userId: { projectId, userId: newUserId } },
        create: { projectId, userId: newUserId, roleIds: [] },
        update: {},
      })
      expect(events.emitAsync).toHaveBeenCalledWith('projectMember.upsert', {
        projectId,
        userId: newUserId,
      })
      expect(result).toBeDefined()
    })

    it('adds member by email and returns updated member list', async () => {
      const projectId = faker.string.uuid()
      const ownerId = faker.string.uuid()
      const email = faker.internet.email()
      const body = { email }

      prisma.project.findUnique.mockResolvedValue(makeProject({ ownerId }))
      prisma.user.findFirst.mockResolvedValue(makeUser({ email }))
      prisma.projectMembers.upsert.mockResolvedValue(makeProjectMembers({ projectId }))
      prisma.projectMembers.findMany.mockResolvedValue([])

      const result = await service.addMember(projectId, body)

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email, type: 'human' },
      })
      expect(result).toBeDefined()
    })

    it('throws BadRequestException when adding owner as member', async () => {
      const projectId = faker.string.uuid()
      const ownerId = faker.string.uuid()
      const body = { userId: ownerId }

      prisma.project.findUnique.mockResolvedValue(makeProject({ ownerId }))
      prisma.user.findFirst.mockResolvedValue(makeUser({ id: ownerId }))

      await expect(service.addMember(projectId, body))
        .rejects.toThrow('Le owner ne peut pas être ajouté à cette liste')
    })

    it('throws NotFoundException when user not found by userId', async () => {
      const projectId = faker.string.uuid()
      const body = { userId: faker.string.uuid() }

      prisma.project.findUnique.mockResolvedValue(makeProject({ ownerId: faker.string.uuid() }))
      prisma.user.findFirst.mockResolvedValue(null)

      await expect(service.addMember(projectId, body))
        .rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException with keycloak message when user not found by email', async () => {
      const projectId = faker.string.uuid()
      const body = { email: faker.internet.email() }

      prisma.project.findUnique.mockResolvedValue(makeProject({ ownerId: faker.string.uuid() }))
      prisma.user.findFirst.mockResolvedValue(null)

      await expect(service.addMember(projectId, body))
        .rejects.toThrow('Utilisateur introuvable (la recherche par email nécessite le hook Keycloak')
    })

    it('throws NotFoundException when project does not exist', async () => {
      prisma.project.findUnique.mockResolvedValue(null)

      await expect(
        service.addMember(faker.string.uuid(), { userId: faker.string.uuid() }),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('patchMembers', () => {
    it('upserts multiple members and emits events', async () => {
      const projectId = faker.string.uuid()
      const members = [
        { userId: faker.string.uuid(), roles: [faker.string.uuid()] },
        { userId: faker.string.uuid(), roles: [] },
      ]

      const tx = mockDeep<Prisma.TransactionClient>()
      prisma.$transaction.mockImplementation(async cb => cb(tx))
      prisma.projectMembers.findMany.mockResolvedValue([])

      await service.patchMembers(projectId, members)

      expect(tx.projectMembers.upsert).toHaveBeenCalledTimes(2)
      expect(events.emitAsync).toHaveBeenCalledTimes(2)
      expect(events.emitAsync).toHaveBeenCalledWith('projectMember.upsert', {
        projectId,
        userId: members[0].userId,
      })
      expect(events.emitAsync).toHaveBeenCalledWith('projectMember.upsert', {
        projectId,
        userId: members[1].userId,
      })
    })
  })

  describe('removeMember', () => {
    it('deletes member, emits event, returns updated list', async () => {
      const projectId = faker.string.uuid()
      const userId = faker.string.uuid()
      prisma.projectMembers.delete.mockResolvedValue(makeProjectMembers({ projectId, userId }))
      const memberUser = makeUser()
      prisma.projectMembers.findMany.mockResolvedValue([makeProjectMemberWithUser(memberUser)])

      const result = await service.removeMember(projectId, userId)

      expect(prisma.projectMembers.delete).toHaveBeenCalledWith({
        where: { projectId_userId: { projectId, userId } },
      })
      expect(events.emitAsync).toHaveBeenCalledWith('projectMember.delete', {
        projectId,
        userId,
      })
      expect(result).toBeDefined()
    })
  })

  describe('getProjectsData', () => {
    it('returns CSV string', async () => {
      prisma.project.findMany.mockResolvedValue([makeProjectWithDetails()])

      const result = await service.getProjectsData()

      expect(typeof result).toBe('string')
      expect(result).toContain('name')
    })
  })

  describe('bulkActionProject', () => {
    it('processes specific project ids', async () => {
      const projectIds = [faker.string.uuid(), faker.string.uuid()]
      const data = { action: 'archive' as const, projectIds }

      prisma.repository.deleteMany.mockResolvedValue({ count: 0 })
      prisma.environment.deleteMany.mockResolvedValue({ count: 0 })
      prisma.deployment.deleteMany.mockResolvedValue({ count: 0 })
      datastore.getProjectWithDetails.mockResolvedValue(makeProjectWithDetails())
      prisma.project.update.mockResolvedValue(makeProject())

      await service.bulkActionProject(data)

      expect(datastore.getProjectWithDetails).toHaveBeenCalledTimes(2)
    })

    it('resolves "all" to all non-archived project ids', async () => {
      const project1Id = faker.string.uuid()
      const project2Id = faker.string.uuid()

      prisma.project.findMany.mockResolvedValue([makeProject({ id: project1Id }), makeProject({ id: project2Id })])
      prisma.repository.deleteMany.mockResolvedValue({ count: 0 })
      prisma.environment.deleteMany.mockResolvedValue({ count: 0 })
      prisma.deployment.deleteMany.mockResolvedValue({ count: 0 })
      datastore.getProjectWithDetails.mockResolvedValue(makeProjectWithDetails())
      prisma.project.update.mockResolvedValue(makeProject())

      await service.bulkActionProject({ action: 'archive', projectIds: 'all' })

      expect(prisma.project.findMany).toHaveBeenCalledWith({
        select: { id: true },
        where: { status: { not: 'archived' } },
      })
      expect(datastore.getProjectWithDetails).toHaveBeenCalledTimes(2)
    })

    it('lock action updates locked to true via prisma', async () => {
      const projectId = faker.string.uuid()

      prisma.project.update.mockResolvedValue(makeProject({ id: projectId }))

      await service.bulkActionProject(
        { action: 'lock', projectIds: [projectId] },
      )

      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: projectId },
        data: { locked: true },
      })
    })

    it('unlock action updates locked to false via prisma', async () => {
      const projectId = faker.string.uuid()

      prisma.project.update.mockResolvedValue(makeProject({ id: projectId }))

      await service.bulkActionProject(
        { action: 'unlock', projectIds: [projectId] },

      )

      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: projectId },
        data: { locked: false },
      })
    })

    it('replay action triggers hooks', async () => {
      const projectId = faker.string.uuid()
      const pwd = makeProjectWithDetails({ id: projectId })
      datastore.getProjectWithDetails.mockResolvedValue(pwd)

      await service.bulkActionProject(
        { action: 'replay', projectIds: [projectId] },

      )

      expect(events.emitAsync).toHaveBeenCalledWith('project.upsert', pwd)
    })

    it('silently ignores errors in individual tasks', async () => {
      const project1Id = faker.string.uuid()
      const project2Id = faker.string.uuid()

      datastore.getProjectWithDetails
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce(makeProjectWithDetails({ id: project2Id }))
      prisma.repository.deleteMany.mockResolvedValue({ count: 0 })
      prisma.environment.deleteMany.mockResolvedValue({ count: 0 })
      prisma.deployment.deleteMany.mockResolvedValue({ count: 0 })
      prisma.project.update.mockResolvedValue(makeProject({ id: project2Id }))

      await service.bulkActionProject(
        { action: 'archive', projectIds: [project1Id, project2Id] },
      )
    })
  })
})
