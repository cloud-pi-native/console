import type { TestingModule } from '@nestjs/testing'
import type { Prisma } from '@prisma/client'
import type { Mocked } from 'vitest'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { UserContext } from '../infrastructure/auth/user.guard.js'
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
import { ConfigurationService } from '../infrastructure/configuration/configuration.service.js'
import { PrismaService } from '../infrastructure/database/prisma.service.js'
import { VaultClientService } from '../vault/vault-client.service.js'
import { VaultService } from '../vault/vault.service.js'
import {
  makeCreateProjectBody,
  makeListProjectsQuery,
  makeProject,
  makeProjectContext,
  makeProjectMemberWithUser,
  makeProjectWithDetails,
  makeProjectWithMembersResult,
  makeUser,
  makeVaultSecret,
} from './project-testing.utils.js'
import { ProjectService } from './project.service.js'
import { generateSlug } from './project.utils.js'

describe('projectService', () => {
  let module: TestingModule
  let service: ProjectService
  let prisma: DeepMockProxy<PrismaService>
  let events: Mocked<EventEmitter2>
  let vault: Mocked<VaultService>
  let vaultClient: Mocked<VaultClientService>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()

    module = await Test.createTestingModule({
      providers: [
        ProjectService,
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
    vault = module.get(VaultService)
    vaultClient = module.get(VaultClientService)

    prisma.$transaction.mockImplementation(async (cb) => {
      const tx = {
        project: prisma.project,
        projectMembers: prisma.projectMembers,
        user: prisma.user,
        repository: prisma.repository,
        environment: prisma.environment,
        deployment: prisma.deployment,
      } as unknown as Prisma.TransactionClient
      return cb(tx)
    })
  })

  describe('create', () => {
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

      const result = await service.create(body, userId)

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

      await expect(service.create(body, userId))
        .rejects.toThrow(InternalServerErrorException)
    })
  })

  describe('list', () => {
    it('returns projects filtered by member for non-admin', async () => {
      const userId = faker.string.uuid()
      const user = { id: userId, adminPermissions: 0n } satisfies UserContext
      const projects = [makeProjectWithDetails(), makeProjectWithDetails()]
      prisma.project.findMany.mockResolvedValue(projects)

      const result = await service.list(
        makeListProjectsQuery(),
        user,
      )

      expect(prisma.project.findMany).toHaveBeenCalled()
      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('id')
      expect(result[0]).toHaveProperty('slug')
    })

    it('allows admin-only "all" filter for admin users', async () => {
      const userId = faker.string.uuid()
      const adminPerms = BigInt(2)
      const user = { id: userId, adminPermissions: adminPerms } satisfies UserContext
      prisma.project.findMany.mockResolvedValue([makeProjectWithDetails()])

      const result = await service.list(
        makeListProjectsQuery({ filter: 'all' }),
        user,
      )

      expect(prisma.project.findMany).toHaveBeenCalled()
      expect(result).toHaveLength(1)
    })

    it('forbids "all" filter for non-admin users', async () => {
      const userId = faker.string.uuid()
      const user = { id: userId, adminPermissions: 0n } satisfies UserContext

      await expect(
        service.list(makeListProjectsQuery({ filter: 'all' }), user),
      ).rejects.toThrow(ForbiddenException)
    })

    it('filters by status', async () => {
      const userId = faker.string.uuid()
      const user = { id: userId, adminPermissions: 0n } satisfies UserContext
      prisma.project.findMany.mockResolvedValue([])

      await service.list(
        makeListProjectsQuery({ status: 'created' }),
        user,
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
      const user = { id: userId, adminPermissions: 0n } satisfies UserContext
      const search = 'myproject'
      prisma.project.findMany.mockResolvedValue([])

      await service.list(
        makeListProjectsQuery({ search }),
        user,
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

  describe('get', () => {
    it('returns ProjectV2 for non-archived project', async () => {
      const ctx = makeProjectContext({ status: 'created' })
      const pwd = makeProjectWithDetails({ id: ctx.id, status: 'created' })
      prisma.project.findFirst.mockResolvedValue(pwd)

      const result = await service.get(ctx.id)

      expect(result).toBeDefined()
      expect(result.id).toBe(ctx.id)
      expect(result.status).toBe('created')
    })

    it('throws NotFoundException for archived project', async () => {
      const ctx = makeProjectContext({ status: 'archived' })
      prisma.project.findFirst.mockResolvedValue(null)

      await expect(service.get(ctx.id)).rejects.toThrow(NotFoundException)
    })

    it('throws NotFoundException when project cannot be loaded', async () => {
      const ctx = makeProjectContext({ status: 'created' })
      prisma.project.findFirst.mockResolvedValue(null)

      await expect(service.get(ctx.id)).rejects.toThrow(NotFoundException)
    })
  })

  describe('update', () => {
    it('updates description and returns updated project', async () => {
      const ctx = makeProjectContext({ status: 'created', locked: false })
      const requestorId = faker.string.uuid()
      const pwd = makeProjectWithDetails({ id: ctx.id })
      const updatedPwd = makeProjectWithDetails({ id: ctx.id, description: 'Updated desc' })

      const tx = mockDeep<Prisma.TransactionClient>()
      tx.project.findFirst.mockResolvedValue(pwd as any)
      tx.project.findUnique.mockResolvedValue(updatedPwd)
      prisma.$transaction.mockImplementation(async cb => cb(tx))

      const result = await service.update(
        { description: 'Updated desc' },
        { id: requestorId, adminPermissions: 0n },
        ctx.id,
      )

      expect(result.description).toBe('Updated desc')
      expect(events.emitAsync).toHaveBeenCalledWith('project.upsert', expect.anything())
    })

    it('strips locked field for non-admin', async () => {
      const ctx = makeProjectContext({ locked: false })
      const requestorId = faker.string.uuid()
      const pwd = makeProjectWithDetails({ id: ctx.id })

      const tx = mockDeep<Prisma.TransactionClient>()
      tx.project.findFirst.mockResolvedValue(pwd as any)
      tx.project.findUnique.mockResolvedValue(pwd)
      prisma.$transaction.mockImplementation(async cb => cb(tx))

      await service.update(
        { locked: true },
        { id: requestorId, adminPermissions: 0n },
        ctx.id,
      )

      expect(tx.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ctx.id },
          data: {},
        }),
      )
    })

    it('allows admin to update locked field', async () => {
      const ctx = makeProjectContext({ locked: false })
      const requestorId = faker.string.uuid()
      const adminPerms = BigInt(2)
      const pwd = makeProjectWithDetails({ id: ctx.id })

      const tx = mockDeep<Prisma.TransactionClient>()
      tx.project.findFirst.mockResolvedValue(pwd as any)
      tx.project.findUnique.mockResolvedValue(pwd)
      prisma.$transaction.mockImplementation(async cb => cb(tx))

      await service.update(
        { locked: true },
        { id: requestorId, adminPermissions: adminPerms },
        ctx.id,
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
      tx.project.findFirst.mockResolvedValue(pwd as any)
      tx.project.findUnique.mockResolvedValue(pwd)
      prisma.$transaction.mockImplementation(async cb => cb(tx))

      await service.update(
        { ownerId: faker.string.uuid() },
        { id: requestorId, adminPermissions: 0n },
        ctx.id,
      )

      expect(tx.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ctx.id },
          data: {},
        }),
      )
    })

    it('throws ForbiddenException when project is locked and not unlocking', async () => {
      const ctx = makeProjectContext({ locked: true })
      const requestorId = faker.string.uuid()
      const pwd = makeProjectWithDetails({ id: ctx.id, locked: true })

      const tx = mockDeep<Prisma.TransactionClient>()
      tx.project.findFirst.mockResolvedValue(pwd as any)
      prisma.$transaction.mockImplementation(async cb => cb(tx))

      await expect(
        service.update(
          { description: 'test' },
          { id: requestorId, adminPermissions: 0n },
          ctx.id,
        ),
      ).rejects.toThrow(ForbiddenException)
    })

    it('allows admin to unlock a locked project', async () => {
      const ctx = makeProjectContext({ locked: true })
      const requestorId = faker.string.uuid()
      const adminPerms = BigInt(2)
      const pwd = makeProjectWithDetails({ id: ctx.id, locked: true })

      const tx = mockDeep<Prisma.TransactionClient>()
      tx.project.findFirst.mockResolvedValue(pwd as any)
      tx.project.findUnique.mockResolvedValue(pwd)
      prisma.$transaction.mockImplementation(async cb => cb(tx))

      await service.update(
        { locked: false },
        { id: requestorId, adminPermissions: adminPerms },
        ctx.id,
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
      tx.project.findFirst.mockResolvedValue(pwd as any)
      prisma.$transaction.mockImplementation(async cb => cb(tx))

      await expect(
        service.update(
          { ownerId: newOwnerId },
          { id: requestorId, adminPermissions: 0n },
          ctx.id,
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
      tx.project.findFirst.mockResolvedValue(
        makeProjectWithMembersResult(pwd, [makeProjectMemberWithUser(makeUser({ id: newOwnerId, type: 'bot' }))]),
      )
      prisma.$transaction.mockImplementation(async cb => cb(tx))

      await expect(
        service.update(
          { ownerId: newOwnerId },
          { id: requestorId, adminPermissions: 0n },
          ctx.id,
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
      tx.project.findFirst.mockResolvedValue(
        makeProjectWithMembersResult(pwd, [makeProjectMemberWithUser(
          makeUser({ id: newOwnerId, type: 'human' }),
          { roleIds: [faker.string.uuid()] },
        )]),
      )
      tx.project.findUnique.mockResolvedValue(
        makeProjectWithDetails({ id: ctx.id, ownerId: newOwnerId }),
      )
      prisma.$transaction.mockImplementation(async cb => cb(tx))

      const result = await service.update(
        { ownerId: newOwnerId },
        { id: requestorId, adminPermissions: 0n },
        ctx.id,
      )

      expect(tx.projectMembers.delete).toHaveBeenCalledWith({
        where: { projectId_userId: { userId: newOwnerId, projectId: ctx.id } },
      })
      expect(tx.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            owner: { connect: { id: newOwnerId } },
          },
        }),
      )
      expect(result).toBeDefined()
    })
  })

  describe('archive', () => {
    it('deletes related data, emits event, renames and archives project', async () => {
      const projectId = faker.string.uuid()
      const pwd = makeProjectWithDetails({ id: projectId, name: 'myproject', slug: 'myproject' })
      const tx = mockDeep<Prisma.TransactionClient>()
      tx.project.findUnique.mockResolvedValue(pwd)
      tx.repository.deleteMany.mockResolvedValue({ count: 2 })
      tx.environment.deleteMany.mockResolvedValue({ count: 3 })
      tx.deployment.deleteMany.mockResolvedValue({ count: 1 })
      tx.project.update.mockResolvedValue(makeProject({ id: projectId }))
      prisma.$transaction.mockImplementation(async cb => cb(tx))

      await service.archive(projectId)

      expect(tx.repository.deleteMany).toHaveBeenCalledWith({ where: { projectId } })
      expect(tx.environment.deleteMany).toHaveBeenCalledWith({ where: { projectId } })
      expect(tx.deployment.deleteMany).toHaveBeenCalledWith({ where: { projectId } })
      expect(events.emitAsync).toHaveBeenCalledWith('project.delete', pwd)
      expect(tx.project.update).toHaveBeenCalledWith(
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
      const tx = mockDeep<Prisma.TransactionClient>()
      tx.project.findUnique.mockResolvedValue(null)
      prisma.$transaction.mockImplementation(async cb => cb(tx))

      await expect(service.archive(faker.string.uuid()))
        .rejects.toThrow(NotFoundException)
    })
  })

  describe('replayHooks', () => {
    it('emits project.upsert event', async () => {
      const projectId = faker.string.uuid()
      const pwd = makeProjectWithDetails({ id: projectId })
      prisma.project.findFirst.mockResolvedValue(pwd)

      await service.replayHooks(projectId)

      expect(prisma.project.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: projectId }) }))
      expect(events.emitAsync).toHaveBeenCalledWith('project.upsert', pwd)
    })

    it('throws NotFoundException when project does not exist', async () => {
      prisma.project.findFirst.mockResolvedValue(null)

      await expect(service.replayHooks(faker.string.uuid()))
        .rejects.toThrow(NotFoundException)
    })
  })

  describe('getSecrets', () => {
    it('returns parsed secrets from vault', async () => {
      const projectId = faker.string.uuid()
      const slug = 'myproject'
      prisma.project.findUnique.mockResolvedValue(makeProject({ slug }))
      vault.listProjectSecrets.mockResolvedValue(['group1/secret1'])
      vaultClient.read.mockResolvedValue(makeVaultSecret({ data: { key1: 'value1', key2: 42, key3: true, key4: null } }))

      const result = await service.getSecrets(projectId)

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

      const result = await service.getSecrets(projectId)

      expect(result.group1).toHaveProperty('sub/path.nested', 'value')
    })

    it('throws NotFoundException when project does not exist', async () => {
      prisma.project.findUnique.mockResolvedValue(null)

      await expect(service.getSecrets(faker.string.uuid()))
        .rejects.toThrow(NotFoundException)
    })

    it('returns empty object when no secrets exist', async () => {
      const projectId = faker.string.uuid()
      prisma.project.findUnique.mockResolvedValue(makeProject({ slug: 'myproj' }))
      vault.listProjectSecrets.mockResolvedValue([])

      const result = await service.getSecrets(projectId)

      expect(result).toEqual({})
    })

    it('skips secrets that fail to read', async () => {
      const projectId = faker.string.uuid()
      prisma.project.findUnique.mockResolvedValue(makeProject({ slug: 'myproj' }))
      vault.listProjectSecrets.mockResolvedValue(['group1/s1', 'group1/s2'])
      vaultClient.read
        .mockRejectedValueOnce(new Error('vault error'))
        .mockResolvedValueOnce(makeVaultSecret({ data: { key: 'val' } }))

      const result = await service.getSecrets(projectId)

      expect(result.group1).toEqual({ 's2.key': 'val' })
    })
  })

  describe('getData', () => {
    it('returns CSV data array', async () => {
      prisma.project.findMany.mockResolvedValue([makeProjectWithDetails()])

      const result = await service.getData()

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(1)
    })
  })

  describe('bulkAction', () => {
    it('processes specific project ids', async () => {
      const projectIds = [faker.string.uuid(), faker.string.uuid()]
      const data = { action: 'archive' as const, projectIds }

      prisma.repository.deleteMany.mockResolvedValue({ count: 0 })
      prisma.environment.deleteMany.mockResolvedValue({ count: 0 })
      prisma.deployment.deleteMany.mockResolvedValue({ count: 0 })
      prisma.project.findUnique.mockResolvedValue(makeProjectWithDetails())
      prisma.project.update.mockResolvedValue(makeProject())

      await service.bulkAction(data)

      expect(prisma.project.findUnique).toHaveBeenCalledTimes(2)
    })

    it('resolves "all" to all non-archived project ids', async () => {
      const project1Id = faker.string.uuid()
      const project2Id = faker.string.uuid()

      prisma.project.findMany.mockResolvedValue([makeProject({ id: project1Id }), makeProject({ id: project2Id })])
      prisma.repository.deleteMany.mockResolvedValue({ count: 0 })
      prisma.environment.deleteMany.mockResolvedValue({ count: 0 })
      prisma.deployment.deleteMany.mockResolvedValue({ count: 0 })
      prisma.project.findUnique.mockResolvedValue(makeProjectWithDetails())
      prisma.project.update.mockResolvedValue(makeProject())

      await service.bulkAction({ action: 'archive', projectIds: 'all' })

      expect(prisma.project.findMany).toHaveBeenCalledWith({
        select: { id: true },
        where: { status: { not: 'archived' } },
      })
      expect(prisma.project.findUnique).toHaveBeenCalledTimes(2)
    })

    it('lock action updates locked to true via prisma', async () => {
      const projectId = faker.string.uuid()

      prisma.project.update.mockResolvedValue(makeProject({ id: projectId }))

      await service.bulkAction(
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

      await service.bulkAction(
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
      prisma.project.findFirst.mockResolvedValue(pwd)

      await service.bulkAction(
        { action: 'replay', projectIds: [projectId] },

      )

      expect(events.emitAsync).toHaveBeenCalledWith('project.upsert', pwd)
    })

    it('silently ignores errors in individual tasks', async () => {
      const project1Id = faker.string.uuid()
      const project2Id = faker.string.uuid()

      prisma.project.findUnique
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce(makeProjectWithDetails({ id: project2Id }))
      prisma.repository.deleteMany.mockResolvedValue({ count: 0 })
      prisma.environment.deleteMany.mockResolvedValue({ count: 0 })
      prisma.deployment.deleteMany.mockResolvedValue({ count: 0 })
      prisma.project.update.mockResolvedValue(makeProject({ id: project2Id }))

      await service.bulkAction(
        { action: 'archive', projectIds: [project1Id, project2Id] },
      )
    })
  })
})
