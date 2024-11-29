import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import prisma from '../../__mocks__/prisma.js'
import type { UserDetails } from '../../types/index.ts'
import { TokenInvalidReason, getMatchingUsers, listUsers, logViaSession, logViaToken, patchUsers } from './business.ts'
import * as queries from './queries.js'

const listUsersQueryMock = vi.spyOn(queries, 'listUsers')
const getMatchingUsersQueryMock = vi.spyOn(queries, 'getMatchingUsers')

describe('test users business', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  const user = {
    adminRoleIds: [],
    createdAt: new Date(),
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    id: faker.string.uuid(),
    lastName: faker.person.lastName(),
    updatedAt: new Date(),
  }
  const projectId = faker.string.uuid()
  const adminRoleId = faker.string.uuid()
  describe('patchUsers', () => {
    it('should do nothing', async () => {
      prisma.user.update.mockResolvedValue(null)

      await patchUsers([])

      expect(prisma.user.update).toHaveBeenCalledTimes(0)
    })

    it('should update a user adminRoleIds', async () => {
      const userUpdated = { id: user.id, adminRoleIds: user.adminRoleIds }

      prisma.user.update.mockResolvedValue(user)

      prisma.user.findMany.mockResolvedValue([])

      await patchUsers([userUpdated])
      expect(prisma.user.update).toHaveBeenCalledTimes(1)
      expect(prisma.user.findMany).toHaveBeenCalledTimes(1)

      await patchUsers([userUpdated, userUpdated])
      expect(prisma.user.update).toHaveBeenCalledTimes(3)
    })
  })
  describe('listUsers', () => {
    it('should query without where', async () => {
      prisma.user.update.mockResolvedValue(null)

      await listUsers({})

      expect(listUsersQueryMock).toHaveBeenCalledTimes(1)
      expect(listUsersQueryMock).toHaveBeenCalledWith({ AND: [] })
    })
    it('should query with filter adminRoleIds', async () => {
      prisma.user.update.mockResolvedValue(null)

      await listUsers({ adminRoleIds: [adminRoleId] })

      expect(listUsersQueryMock).toHaveBeenCalledTimes(1)
      expect(listUsersQueryMock).toHaveBeenCalledWith({ AND: [{ adminRoleIds: { hasEvery: [adminRoleId] } }] })
    })
  })

  describe('getMatchingUsers', () => {
    const AND = [
      {
        OR: [
          {
            email: {
              contains: 'abc',
              mode: 'insensitive',
            },
          },
          {
            firstName: {
              contains: 'abc',
              mode: 'insensitive',
            },
          },
          {
            lastName: {
              contains: 'abc',
              mode: 'insensitive',
            },
          },
        ],
      },
      {
        type: 'human',
      },
    ]
    it('should query only with letters ', async () => {
      prisma.user.update.mockResolvedValue(null)

      await getMatchingUsers({ letters: 'abc' })

      expect(getMatchingUsersQueryMock).toHaveBeenCalledTimes(1)
      expect(getMatchingUsersQueryMock).toHaveBeenCalledWith({ AND })
    })
    it('should query with letters and projectId', async () => {
      prisma.user.update.mockResolvedValue(null)

      await getMatchingUsers({ letters: 'abc', notInProjectId: projectId })

      expect(getMatchingUsersQueryMock).toHaveBeenCalledTimes(1)
      expect(getMatchingUsersQueryMock).toHaveBeenCalledWith({ AND: [{
        projectMembers: {
          none: {
            projectId,
          },
        },
      }, {
        projectsOwned: {
          none: {
            id: projectId,
          },
        },
      }].concat(AND) })
    })
  })
  describe('logViaSession', () => {
    // ça ne teste pas tout mais c'est déjà bien hein
    const adminRoles = [{
      id: faker.string.uuid(),
      name: faker.company.name(),
      oidcGroup: '',
      permissions: 0n,
      position: 0,
    }, {
      id: faker.string.uuid(),
      name: faker.company.name(),
      oidcGroup: '/admin',
      permissions: 0n,
      position: 0,
    }]
    const userToLog: UserDetails = {
      id: faker.string.uuid(),
      email: user.email,
      firstName: user.firstName,
      groups: [],
      lastName: user.lastName,
    }
    it('should create user and return adminPerms', async () => {
      prisma.adminRole.findMany.mockResolvedValue(adminRoles)
      prisma.user.findUnique.mockResolvedValue(undefined)
      const response = await logViaSession(userToLog)
      expect(response.adminPerms).toBe(0n)
      expect(prisma.user.create).toHaveBeenCalledTimes(1)
    })
    it('should update user and return adminPerms', async () => {
      prisma.adminRole.findMany.mockResolvedValue(adminRoles)
      prisma.user.findUnique.mockResolvedValue(user)
      prisma.user.update.mockResolvedValue(user)
      const response = await logViaSession(userToLog)
      expect(response.adminPerms).toEqual(0n)
      expect(prisma.user.create).toHaveBeenCalledTimes(0)
    })
  })
})

describe('logViaToken', () => {
  const nextYear = new Date()
  const lastYear = new Date()
  nextYear.setFullYear((new Date()).getFullYear() + 1)
  lastYear.setFullYear((new Date()).getFullYear() - 1)
  const baseToken = {
    createdAt: new Date(),
    hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    id: faker.string.uuid(),
    lastUse: null,
    permissions: 2n,
    userId: null,
    status: 'active',
  } as const

  it('should return identity', async () => {
    prisma.adminToken.findFirst.mockResolvedValueOnce({ ...baseToken })
    const identity = await logViaToken('test')
    expect(identity.adminPerms).toBe(2n)
  })

  it('should return identity based on pat', async () => {
    const pat = structuredClone(baseToken)
    delete pat.permissions
    pat.owner = { adminRoleIds: null }
    prisma.personalAccessToken.findFirst.mockResolvedValueOnce(pat)
    const identity = await logViaToken('test')
    expect(identity.adminPerms).toBe(0n)
  })

  it('should return identity, with expirationDate', async () => {
    prisma.adminToken.findFirst.mockResolvedValueOnce({ ...baseToken, expirationDate: nextYear })
    const identity = await logViaToken('test')
    expect(identity.adminPerms).toBe(2n)
  })

  it('should return cause revoked', async () => {
    prisma.adminToken.findFirst.mockResolvedValueOnce({ ...baseToken, status: 'revoked' })
    const identity = await logViaToken('test')
    expect(identity).toBe(TokenInvalidReason.INACTIVE)
  })

  it('should return cause expired', async () => {
    prisma.adminToken.findFirst.mockResolvedValueOnce({ ...baseToken, expirationDate: lastYear })
    const identity = await logViaToken('test')
    expect(identity).toBe(TokenInvalidReason.EXPIRED)
  })

  it('should return cause not found', async () => {
    prisma.adminToken.findFirst.mockResolvedValueOnce(undefined)
    const identity = await logViaToken('test')
    expect(identity).toBe(TokenInvalidReason.NOT_FOUND)
  })
})
