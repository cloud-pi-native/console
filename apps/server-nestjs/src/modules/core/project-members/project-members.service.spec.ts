import type { TestingModule } from '@nestjs/testing'
import type { Prisma } from '@prisma/client'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { PrismaService } from '../../infrastructure/database/prisma.service'
import { KeycloakClientService } from '../../plugins/keycloak/keycloak-client.service.js'
import {
  makeProject,
  makeProjectMembers,
  makeProjectMemberWithUser,
  makeUser,
} from '../project/project-testing.utils'
import { ProjectMembersService } from './project-members.service'

describe('projectMembersService', () => {
  let module: TestingModule
  let service: ProjectMembersService
  let prisma: DeepMockProxy<PrismaService>
  let events: DeepMockProxy<EventEmitter2>
  let keycloak: DeepMockProxy<KeycloakClientService>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()
    events = mockDeep<EventEmitter2>()
    keycloak = mockDeep<KeycloakClientService>()

    module = await Test.createTestingModule({
      providers: [
        ProjectMembersService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: events },
        { provide: KeycloakClientService, useValue: keycloak },
      ],
    }).compile()

    service = module.get<ProjectMembersService>(ProjectMembersService)
  })

  describe('listMembers', () => {
    it('returns members', async () => {
      const projectId = faker.string.uuid()
      const user1 = makeUser()
      const user2 = makeUser()
      prisma.projectMembers.findMany.mockResolvedValue([
        makeProjectMemberWithUser(user1, { roleIds: [faker.string.uuid()] }),
        makeProjectMemberWithUser(user2),
      ])

      const result = await service.listMembers(projectId)

      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('roleIds')
      expect(result[0]).toHaveProperty('user')
      expect(result[0].user.id).toBe(user1.id)
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

      const tx = mockDeep<Prisma.TransactionClient>()
      tx.project.findUnique.mockResolvedValue(makeProject({ ownerId }))
      tx.user.findFirst.mockResolvedValue(makeUser({ id: newUserId }))
      tx.projectMembers.upsert.mockResolvedValue(makeProjectMembers({ projectId, userId: newUserId }))
      const memberUser = makeUser()
      tx.projectMembers.findMany.mockResolvedValue([makeProjectMemberWithUser(memberUser)])
      prisma.$transaction.mockImplementation(async cb => cb(tx))

      const result = await service.addMember(projectId, body)

      expect(tx.projectMembers.upsert).toHaveBeenCalledWith({
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

      const tx = mockDeep<Prisma.TransactionClient>()
      tx.project.findUnique.mockResolvedValue(makeProject({ ownerId }))
      tx.user.findFirst.mockResolvedValue(makeUser({ email }))
      tx.projectMembers.upsert.mockResolvedValue(makeProjectMembers({ projectId }))
      tx.projectMembers.findMany.mockResolvedValue([])
      prisma.$transaction.mockImplementation(async cb => cb(tx))

      const result = await service.addMember(projectId, body)

      expect(tx.user.findFirst).toHaveBeenCalledWith({
        where: { email, type: 'human' },
      })
      expect(result).toBeDefined()
    })

    it('throws when adding owner as member', async () => {
      const projectId = faker.string.uuid()
      const ownerId = faker.string.uuid()
      const body = { userId: ownerId }

      const tx = mockDeep<Prisma.TransactionClient>()
      tx.project.findUnique.mockResolvedValue(makeProject({ ownerId }))
      tx.user.findFirst.mockResolvedValue(makeUser({ id: ownerId }))
      prisma.$transaction.mockImplementation(async cb => cb(tx))

      await expect(service.addMember(projectId, body))
        .rejects.toThrow('Le owner ne peut pas être ajouté à cette liste')
    })

    it('throws NotFoundException when user not found by userId', async () => {
      const projectId = faker.string.uuid()
      const body = { userId: faker.string.uuid() }

      const tx = mockDeep<Prisma.TransactionClient>()
      tx.project.findUnique.mockResolvedValue(makeProject({ ownerId: faker.string.uuid() }))
      tx.user.findFirst.mockResolvedValue(null)
      prisma.$transaction.mockImplementation(async cb => cb(tx))

      await expect(service.addMember(projectId, body))
        .rejects.toThrow(NotFoundException)
    })

    it('falls back to Keycloak when user not found locally by email', async () => {
      const projectId = faker.string.uuid()
      const ownerId = faker.string.uuid()
      const email = faker.internet.email()
      const keycloakUserId = faker.string.uuid()
      const body = { email }

      const tx = mockDeep<Prisma.TransactionClient>()
      tx.project.findUnique.mockResolvedValue(makeProject({ ownerId }))
      tx.user.findFirst.mockResolvedValue(null)
      tx.user.upsert.mockResolvedValue(makeUser({ id: keycloakUserId, email }))
      tx.projectMembers.upsert.mockResolvedValue(makeProjectMembers({ projectId, userId: keycloakUserId }))
      tx.projectMembers.findMany.mockResolvedValue([])
      prisma.$transaction.mockImplementation(async cb => cb(tx))

      keycloak.getUserByEmail.mockResolvedValue(makeUser({
        id: keycloakUserId,
        email,
        firstName: 'Keycloak',
        lastName: 'User',
      }))

      const result = await service.addMember(projectId, body)

      expect(keycloak.getUserByEmail).toHaveBeenCalledWith(email)
      expect(tx.user.upsert).toHaveBeenCalledWith({
        where: { id: keycloakUserId },
        create: {
          id: keycloakUserId,
          email,
          firstName: 'Keycloak',
          lastName: 'User',
          adminRoleIds: [],
          type: 'human',
        },
        update: {
          email,
          firstName: 'Keycloak',
          lastName: 'User',
          type: 'human',
        },
      })
      expect(result).toBeDefined()
    })

    it('throws NotFoundException when user not found by email anywhere', async () => {
      const projectId = faker.string.uuid()
      const body = { email: faker.internet.email() }

      const tx = mockDeep<Prisma.TransactionClient>()
      tx.project.findUnique.mockResolvedValue(makeProject({ ownerId: faker.string.uuid() }))
      tx.user.findFirst.mockResolvedValue(null)
      prisma.$transaction.mockImplementation(async cb => cb(tx))

      await expect(service.addMember(projectId, body))
        .rejects.toThrow(NotFoundException)
    })

    it('throws NotFoundException when project does not exist', async () => {
      const tx = mockDeep<Prisma.TransactionClient>()
      tx.project.findUnique.mockResolvedValue(null)
      prisma.$transaction.mockImplementation(async cb => cb(tx))

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
      tx.projectMembers.findMany.mockResolvedValue([])

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

      const tx = mockDeep<Prisma.TransactionClient>()
      tx.projectMembers.delete.mockResolvedValue(makeProjectMembers({ projectId, userId }))
      const memberUser = makeUser()
      tx.projectMembers.findMany.mockResolvedValue([makeProjectMemberWithUser(memberUser)])
      prisma.$transaction.mockImplementation(async cb => cb(tx))

      const result = await service.removeMember(projectId, userId)

      expect(tx.projectMembers.delete).toHaveBeenCalledWith({
        where: { projectId_userId: { projectId, userId } },
      })
      expect(events.emitAsync).toHaveBeenCalledWith('projectMember.delete', {
        projectId,
        userId,
      })
      expect(result).toBeDefined()
    })
  })
})
