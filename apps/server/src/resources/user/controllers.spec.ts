import prisma from '../../__mocks__/prisma.js'
import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { createRandomDbSetup, getRandomLog, getRandomPerm, getRandomRole, getRandomUser, repeatFn } from '@cpn-console/test-utils'
import { adminGroupPath, projectIsLockedInfo, userContract } from '@cpn-console/shared'
import { getConnection, closeConnections } from '../../connect.js'
import { getRequestor, setRequestor } from '../../utils/mocks.js'
import app from '../../app.js'
import { rolesToMembers } from '../project/business.js'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks.js')).mockSessionPlugin)
vi.mock('../../utils/hook-wrapper.js', (await import('../../utils/mocks.js')).mockHookWrapper)

describe('User routes', () => {
  const requestor = getRandomUser()
  setRequestor(requestor)

  beforeAll(async () => {
    await getConnection()
  })

  afterAll(async () => {
    return closeConnections()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // GET
  describe('getProjectUsersController', () => {
    it('Should retrieve members of a project', async () => {
      const randomDbSetup = createRandomDbSetup({})
      randomDbSetup.project.roles = [...randomDbSetup.project.roles, getRandomRole(getRequestor().id, randomDbSetup.project.id)]
      const users = [...randomDbSetup.users, getRequestor()]

      prisma.user.findMany.mockResolvedValue(users)

      const response = await app.inject()
        .get(`/api/v1/projects/${randomDbSetup.project.id}/users`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toEqual(users)
    })

    it('Should not retrieve members of a project if requestor is not member himself', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const users = randomDbSetup.users

      prisma.user.findMany.mockResolvedValue(users)

      const response = await app.inject()
        .get(`/api/v1/projects/${randomDbSetup.project.id}/users`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).error).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
    })
  })

  // POST
  describe('addUserToProjectController', () => {
    it('Should add an user in project', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const projectInfos = randomDbSetup.project
      setRequestor(randomDbSetup.users[0])
      const userToAdd = getRandomUser()
      const roleToAdd = { ...getRandomRole(userToAdd.id), user: userToAdd }

      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.user.findUnique.mockResolvedValue(userToAdd)
      prisma.role.create.mockResolvedValue({})
      prisma.log.create.mockResolvedValue(getRandomLog('Add Project Member', getRequestor().id))
      prisma.role.findMany.mockResolvedValue([...projectInfos.roles, roleToAdd])

      const response = await app.inject()
        .post(`/api/v1/projects/${projectInfos.id}/users`)
        .body(userToAdd)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.body).toBeDefined()
      expect(response.json()).toMatchObject([...projectInfos.members, ...rolesToMembers([roleToAdd])])
    })

    it('Should not add an user if email already present', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const projectInfos = randomDbSetup.project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      const userToAdd = randomDbSetup.users[0]

      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.user.findUnique.mockResolvedValue(userToAdd)

      const response = await app.inject()
        .post(`/api/v1/projects/${projectInfos.id}/users`)
        .body(userToAdd)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body).error).toEqual('L\'utilisateur est déjà membre du projet')
    })

    it('Should not add an user if project is missing', async () => {
      prisma.project.findUnique.mockResolvedValue(null)

      const response = await app.inject()
        .post('/api/v1/projects/b7b4d9bd-7a8f-4287-bb12-5ce2dadb4bb5/users')
        .body({ email: getRandomUser().email })
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body).error).toEqual('Le projet ayant pour id b7b4d9bd-7a8f-4287-bb12-5ce2dadb4bb5 n\'existe pas')
    })

    it('Should not add an user if project is locked', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const projectInfos = randomDbSetup.project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      projectInfos.locked = true

      prisma.project.findUnique.mockResolvedValue(projectInfos)

      const response = await app.inject()
        .post(`/api/v1/projects/${projectInfos.id}/users`)
        .body({ email: getRandomUser().email })
        .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).error).toEqual(projectIsLockedInfo)
    })
  })

  // PUT
  describe('transferProjectOwnershipController', () => {
    it('Should transfer ownership for a project, as owner', async () => {
      const projectInfos = createRandomDbSetup({ nbUsers: 3 }).project

      const ownerIndex = projectInfos.roles?.findIndex(role => role.role === 'owner')
      setRequestor(projectInfos.roles[ownerIndex].user)
      const indexUserToTransfer = projectInfos.roles?.findIndex(role => role.role !== 'owner')
      const userToTransfer = projectInfos.roles[indexUserToTransfer].user

      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.role.update.mockResolvedValue([])
      prisma.permission.upsert.mockResolvedValue(getRandomPerm())
      prisma.role.findMany.mockResolvedValueOnce(projectInfos.roles)

      const response = await app.inject()
        .put(`/api/v1/projects/${projectInfos.id}/users/${userToTransfer.id}`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(response.json()).toEqual(rolesToMembers(projectInfos.roles))
    })

    it('Should transfer ownership for a project, as admin', async () => {
      const projectInfos = createRandomDbSetup({ nbUsers: 3 }).project

      const indexUserToTransfer = projectInfos.roles?.findIndex(role => role.role !== 'owner')
      const userToTransfer = projectInfos.roles[indexUserToTransfer].user

      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.role.update.mockResolvedValue([])
      prisma.permission.upsert.mockResolvedValue(getRandomPerm())
      prisma.role.findMany.mockResolvedValueOnce(projectInfos.roles)

      requestor.groups = [adminGroupPath]
      setRequestor(requestor)
      const response = await app.inject()
        .put(`/api/v1/projects/${projectInfos.id}/users/${userToTransfer.id}`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(response.json()).toEqual(rolesToMembers(projectInfos.roles))
    })

    it('Should not transfer ownership for a locked project', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.locked = true

      prisma.project.findUnique.mockResolvedValue(projectInfos)

      const response = await app.inject()
        .put(`/api/v1/projects/${projectInfos.id}/users/b7b4d9bd-7a8f-4287-bb12-5ce2dadb4bb5`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).error).toEqual(projectIsLockedInfo)
    })

    it('Should not transfer ownership for a project if user is not member', async () => {
      const projectInfos = createRandomDbSetup({}).project
      const userToTransfer = getRandomUser()
      projectInfos.roles = [getRandomRole(requestor.id, projectInfos.id, 'owner')]

      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.role.findMany.mockResolvedValueOnce(projectInfos.roles)

      const response = await app.inject()
        .put(`/api/v1/projects/${projectInfos.id}/users/${userToTransfer.id}`)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(JSON.parse(response.body).error).toEqual('L\'utilisateur ne fait pas partie du projet')
    })

    it('Should not transfer ownership for a project if owner is not found', async () => {
      const projectInfos = createRandomDbSetup({}).project
      const userToTransfer = getRandomUser()
      projectInfos.roles = [getRandomRole(userToTransfer.id, projectInfos.id, 'user')]

      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.role.findMany.mockResolvedValueOnce(projectInfos.roles)

      const response = await app.inject()
        .put(`/api/v1/projects/${projectInfos.id}/users/${userToTransfer.id}`)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(JSON.parse(response.body).error).toEqual('Impossible de trouver le souscripteur actuel du projet')
    })
  })

  // DELETE
  describe('removeUserFromProjectController', () => {
    it('Should remove an user from a project', async () => {
      const randomDbSetup = createRandomDbSetup({ nbUsers: 2 })
      const projectInfos = randomDbSetup.project
      setRequestor(randomDbSetup.users[0])
      const userToRemove = randomDbSetup.users[1]

      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.user.findUnique.mockResolvedValue(userToRemove)
      prisma.permission.deleteMany.mockResolvedValue([])
      prisma.role.delete.mockResolvedValue(userToRemove)
      prisma.log.create.mockResolvedValue(getRandomLog('Remove User from Project', getRequestor().id))
      prisma.role.findMany.mockResolvedValue([projectInfos.roles[0]])

      const response = await app.inject()
        .delete(`/api/v1/projects/${projectInfos.id}/users/${userToRemove.id}`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(response.json()).toEqual([projectInfos.members[0]])
    })

    it('Should not remove an user if project is missing', async () => {
      prisma.project.findUnique.mockResolvedValue(null)

      const response = await app.inject()
        .delete('/api/v1/projects/b7b4d9bd-7a8f-4287-bb12-5ce2dadb4bb5/users/b7b4d9bd-7a8f-4287-bb12-5ce2dadb4bb5')
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body).error).toEqual('Le projet ayant pour id b7b4d9bd-7a8f-4287-bb12-5ce2dadb4bb5 n\'existe pas')
    })

    it('Should not remove an user if requestor is not member himself', async () => {
      const projectInfos = createRandomDbSetup({}).project
      requestor.groups = []

      prisma.project.findUnique.mockResolvedValue(projectInfos)

      const response = await app.inject()
        .delete(`/api/v1/projects/${projectInfos.id}/users/b7b4d9bd-7a8f-4287-bb12-5ce2dadb4bb5`)
        .end()
      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).error).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
    })

    it('Should not remove an user if user is not member', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      const userToRemove = getRandomUser()

      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.user.findUnique.mockResolvedValue(userToRemove)

      const response = await app.inject()
        .delete(`/api/v1/projects/${projectInfos.id}/users/${userToRemove.id}`)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body).error).toEqual('L\'utilisateur n\'est pas membre du projet')
    })
  })

  // GET
  describe('getUsersController', () => {
    it('Should retrieve users', async () => {
      // Create users
      const users = repeatFn(5)(getRandomUser)
      requestor.groups = [adminGroupPath]
      setRequestor(requestor)

      prisma.user.findMany.mockResolvedValue(users)
      prisma.adminPlugin.findMany.mockResolvedValue([])

      const response = await app.inject()
        .get(userContract.getAllUsers.path)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual(users.map(user => ({ ...user, isAdmin: false })))
    })

    it('Should return an error if retrieve users failed', async () => {
      const errorMessage = 'Erreur de récupération des utilisateurs'
      requestor.groups = [adminGroupPath]
      setRequestor(requestor)

      prisma.user.findMany.mockRejectedValue(new Error(errorMessage))

      const response = await app.inject()
        .get(userContract.getAllUsers.path)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(JSON.parse(response.body).error).toEqual(errorMessage)
    })

    it('Should return an error if requestor is not admin', async () => {
      const requestor = getRandomUser()
      requestor.groups = []
      setRequestor(requestor)

      const response = await app.inject()
        .get(userContract.getAllUsers.path)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).error).toEqual('Vous n\'avez pas les droits administrateur')
    })
  })

  // PUT
  describe('updateUserAdminRole', () => {
    it('Should make an non-admin user admin', async () => {
      const user = getRandomUser()
      requestor.groups = [adminGroupPath]
      setRequestor(requestor)

      prisma.adminPlugin.findMany.mockResolvedValue([])

      const response = await app.inject()
        .put(`/api/v1/users/${user.id}`)
        .body({ isAdmin: false })
        .end()

      expect(response.statusCode).toEqual(204)
    })

    it('Should make an admin user non-admin', async () => {
      const user = getRandomUser()
      requestor.groups = [adminGroupPath]
      setRequestor(requestor)

      prisma.adminPlugin.findMany.mockResolvedValue([])

      const response = await app.inject()
        .put(`/api/v1/users/${user.id}`)
        .body({ isAdmin: true })
        .end()

      expect(response.statusCode).toEqual(204)
    })
  })
})
