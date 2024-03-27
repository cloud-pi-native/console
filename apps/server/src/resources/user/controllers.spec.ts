import prisma from '../../__mocks__/prisma.js'
import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { createRandomDbSetup, getRandomLog, getRandomRole, getRandomUser } from '@cpn-console/test-utils'
import { getConnection, closeConnections } from '../../connect.js'
import { projectIsLockedInfo } from '@cpn-console/shared'
import { getRequestor, setRequestor } from '../../utils/mocks.js'
import app from '../../app.js'

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
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      const userToAdd = getRandomUser()

      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.user.findUnique.mockResolvedValue(userToAdd)
      prisma.log.create.mockResolvedValue(getRandomLog('Add Project Member', getRequestor().id))
      prisma.project.update.mockResolvedValue(projectInfos)
      prisma.environment.findMany.mockResolvedValue([])
      prisma.repository.findMany.mockResolvedValue([])
      prisma.role.findMany.mockResolvedValue(projectInfos.roles)
      delete projectInfos.roles[0].user

      const response = await app.inject()
        .post(`/api/v1/projects/${projectInfos.id}/users`)
        .body(userToAdd)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.body).toBeDefined()
      expect(response.json()).toMatchObject(projectInfos.roles)
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
  describe('updateUserProjectRoleController', () => {
    it('Should update a project member\'s role', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      const userToUpdate = projectInfos.roles[0]
      const userUpdated = userToUpdate
      userUpdated.role = 'user'

      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.role.update.mockResolvedValue(userUpdated)
      prisma.role.findMany.mockResolvedValue(projectInfos.roles)
      delete projectInfos.roles[0].user

      const response = await app.inject()
        .put(`/api/v1/projects/${projectInfos.id}/users/${userToUpdate.userId}`)
        .body(userUpdated)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(response.json()).toEqual(projectInfos.roles)
    })

    it('Should not update a project member\'s role if project locked', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      projectInfos.locked = true
      const userToUpdate = projectInfos.roles[0]
      const userUpdated = { ...userToUpdate, role: 'user' }

      prisma.project.findUnique.mockResolvedValue(projectInfos)

      const response = await app.inject()
        .put(`/api/v1/projects/${projectInfos.id}/users/b7b4d9bd-7a8f-4287-bb12-5ce2dadb4bb5`)
        .body(userUpdated)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).error).toEqual(projectIsLockedInfo)
    })
  })

  // DELETE
  describe('removeUserFromProjectController', () => {
    it('Should remove an user from a project', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      const userToRemove = projectInfos.roles[0]

      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.user.findUnique.mockResolvedValue(userToRemove.user)
      prisma.log.create.mockResolvedValue(getRandomLog('Remove User from Project', getRequestor().id))
      prisma.project.update.mockResolvedValue(projectInfos)
      prisma.environment.deleteMany.mockResolvedValue()
      prisma.role.delete.mockResolvedValue(userToRemove)
      prisma.environment.findMany.mockResolvedValue([])
      prisma.repository.findMany.mockResolvedValue([])
      prisma.role.findMany.mockResolvedValue(projectInfos.roles)
      delete projectInfos.roles[0].user

      const response = await app.inject()
        .delete(`/api/v1/projects/${projectInfos.id}/users/${userToRemove.userId}`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(response.json()).toEqual(projectInfos.roles)
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
})
