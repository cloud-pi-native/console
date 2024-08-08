import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import prisma from '../../__mocks__/prisma.js'
import { getMatchingUsers, getUsers, logUser, patchUsers } from './business.ts'
import * as queries from './queries.js'
import { AdminRole, User } from '@prisma/client'
import { UserDetails } from '../../types/index.ts'

const getUsersQueryMock = vi.spyOn(queries, 'getUsers')
const getMatchingUsersQueryMock = vi.spyOn(queries, 'getMatchingUsers')

describe('Test users business', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  const user: User = {
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

      await patchUsers([userUpdated]),
      expect(prisma.user.update).toHaveBeenCalledTimes(1)
      expect(prisma.user.findMany).toHaveBeenCalledTimes(1)

      await patchUsers([userUpdated, userUpdated])
      expect(prisma.user.update).toHaveBeenCalledTimes(3)
    })
  })
  describe('getUsers', () => {
    it('Should query without where', async () => {
      prisma.user.update.mockResolvedValue(null)

      await getUsers({})

      expect(getUsersQueryMock).toHaveBeenCalledTimes(1)
      expect(getUsersQueryMock).toHaveBeenCalledWith({})
    })
    it('Should query with filter adminRoleIds', async () => {
      prisma.user.update.mockResolvedValue(null)

      await getUsers({ adminRoleId })

      expect(getUsersQueryMock).toHaveBeenCalledTimes(1)
      expect(getUsersQueryMock).toHaveBeenCalledWith({ adminRoleIds: { has: adminRoleId } })
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
    ]
    it('Should query only with letters ', async () => {
      prisma.user.update.mockResolvedValue(null)

      await getMatchingUsers({ letters: 'abc' })

      expect(getMatchingUsersQueryMock).toHaveBeenCalledTimes(1)
      expect(getMatchingUsersQueryMock).toHaveBeenCalledWith({ AND })
    })
    it('Should query with letters and projectId', async () => {
      prisma.user.update.mockResolvedValue(null)

      await getMatchingUsers({ letters: 'abc', notInProjectId: projectId })

      expect(getMatchingUsersQueryMock).toHaveBeenCalledTimes(1)
      expect(getMatchingUsersQueryMock).toHaveBeenCalledWith({ AND: [{
        ProjectMembers: {
          none: {
            projectId: projectId,
          },
        },
      },
      {
        projectsOwned: {
          none: {
            id: projectId,
          },
        },
      }].concat(AND) })
    })
  })
  describe('logUser', () => {
    // ça ne teste pas tout mais c'est déjà bien hein
    const adminRoles: AdminRole[] = [{
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
      const response = await logUser(userToLog, true)
      expect(response.adminPerms).toBe(0n)
    })
    it('should create user and not return adminPerms', async () => {
      prisma.adminRole.findMany.mockResolvedValue(adminRoles)
      prisma.user.create.mockResolvedValue(user)
      const response = await logUser(userToLog, false)
      expect(response.adminPerms).toBeUndefined()
    })
    it('should update user and return adminPerms', async () => {
      prisma.adminRole.findMany.mockResolvedValue(adminRoles)
      prisma.user.findUnique.mockResolvedValue(user)
      prisma.user.update.mockResolvedValue(user)
      const response = await logUser(userToLog, true)
      expect(response.adminPerms).toBe(0n)
    })
    it('should update user and not return adminPerms', async () => {
      prisma.adminRole.findMany.mockResolvedValue(adminRoles)
      prisma.user.findUnique.mockResolvedValue(user)
      prisma.user.update.mockResolvedValue(user)
      const response = await logUser(userToLog, false)
      expect(response.adminPerms).toBeUndefined()
    })
  })
})
