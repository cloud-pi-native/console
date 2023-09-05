import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { User, createRandomDbSetup, getRandomLog, getRandomRole, getRandomUser } from '@dso-console/test-utils'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '../utils/keycloak.js'
import { getConnection, closeConnections } from '../connect.js'
import userRouter from './project-user.js'
import { projectIsLockedInfo } from '@dso-console/shared'
import prisma from '../__mocks__/prisma.js'

vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => vi.fn()) }))
vi.mock('../prisma.js')

const app = fastify({ logger: false })
  .register(fastifyCookie)
  .register(fastifySession, sessionConf)

const mockSessionPlugin = (app, opt, next) => {
  app.addHook('onRequest', (req, res, next) => {
    req.session = { user: getRequestor() }
    next()
  })
  next()
}

const mockSession = (app) => {
  app.register(fp(mockSessionPlugin))
    .register(userRouter)
}

let requestor: User

const setRequestor = (user: User) => {
  requestor = user
}

const getRequestor = () => {
  return requestor
}

describe('User routes', () => {
  const requestor = getRandomUser()
  setRequestor(requestor)

  beforeAll(async () => {
    mockSession(app)
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
    it('Should retreive members of a project', async () => {
      const randomDbSetup = createRandomDbSetup({})
      randomDbSetup.project.roles = [...randomDbSetup.project.roles, getRandomRole(requestor.id, randomDbSetup.project.id)]
      const users = [...randomDbSetup.users, requestor]

      prisma.user.findMany.mockResolvedValue(users)

      const response = await app.inject()
        .get(`/${randomDbSetup.project.id}/users`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toEqual(users)
    })

    it('Should not retreive members of a project if requestor is not member himself', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const users = randomDbSetup.users

      prisma.user.findMany.mockResolvedValue(users)

      const response = await app.inject()
        .get(`/${randomDbSetup.project.id}/users`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).message).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
    })
  })

  // POST
  describe('addUserToProjectController', () => {
    it('Should add an user in project', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(requestor.id, projectInfos.id, 'owner')]
      const userToAdd = getRandomUser()

      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.user.findUnique.mockResolvedValue(userToAdd)
      prisma.log.create.mockResolvedValue(getRandomLog('Add Project Member', requestor.id))
      prisma.project.update.mockResolvedValue(projectInfos)
      prisma.environment.findMany.mockResolvedValue([])
      prisma.repository.findMany.mockResolvedValue([])

      const response = await app.inject()
        .post(`/${projectInfos.id}/users`)
        .body(userToAdd)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Utilisateur ajouté au projet avec succès')
    })

    it('Should not add an user if email already present', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const projectInfos = randomDbSetup.project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(requestor.id, projectInfos.id, 'owner')]
      const userToAdd = randomDbSetup.users[0]

      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.user.findUnique.mockResolvedValue(userToAdd)

      const response = await app.inject()
        .post(`/${projectInfos.id}/users`)
        .body(userToAdd)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body).message).toEqual('L\'utilisateur est déjà membre du projet')
    })

    it('Should not add an user if project is missing', async () => {
      prisma.project.findUnique.mockResolvedValue(null)

      const response = await app.inject()
        .post('/thisIsAnId/users')
        .body({})
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body).message).toEqual('Cannot read properties of null (reading \'roles\')')
    })

    it('Should not add an user if project is locked', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const projectInfos = randomDbSetup.project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(requestor.id, projectInfos.id, 'owner')]
      projectInfos.locked = true

      prisma.project.findUnique.mockResolvedValue(projectInfos)

      const response = await app.inject()
        .post(`/${projectInfos.id}/users`)
        .body({})
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body).message).toEqual(projectIsLockedInfo)
    })
  })

  // PUT
  describe('updateUserProjectRoleController', () => {
    it('Should update a project member\'s role', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(requestor.id, projectInfos.id, 'owner')]
      const userToUpdate = projectInfos.roles[0]
      const userUpdated = userToUpdate
      userUpdated.role = 'user'

      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.role.update.mockResolvedValue(userUpdated)

      const response = await app.inject()
        .put(`/${projectInfos.id}/users/${userToUpdate.userId}`)
        .body(userUpdated)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Rôle de l\'utilisateur mis à jour avec succès')
    })

    it('Should not update a project member\'s role if project locked', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(requestor.id, projectInfos.id, 'owner')]
      projectInfos.locked = true

      prisma.project.findUnique.mockResolvedValue(projectInfos)

      const response = await app.inject()
        .put(`/${projectInfos.id}/users/thisIsAnId`)
        .body({})
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body).message).toEqual(projectIsLockedInfo)
    })
  })

  // DELETE
  describe('removeUserFromProjectController', () => {
    it('Should remove an user from a project', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(requestor.id, projectInfos.id, 'owner')]
      const userToRemove = projectInfos.roles[0]

      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.user.findUnique.mockResolvedValue(userToRemove.user)
      prisma.log.create.mockResolvedValue(getRandomLog('Remove User from Project', requestor.id))
      prisma.project.update.mockResolvedValue(projectInfos)
      prisma.environment.deleteMany.mockResolvedValue()
      prisma.role.delete.mockResolvedValue(userToRemove)
      prisma.environment.findMany.mockResolvedValue([])
      prisma.repository.findMany.mockResolvedValue([])

      const response = await app.inject()
        .delete(`/${projectInfos.id}/users/${userToRemove.userId}`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Utilisateur retiré du projet avec succès')
    })

    it('Should not remove an user if project is missing', async () => {
      prisma.project.findUnique.mockResolvedValue(null)

      const response = await app.inject()
        .delete('/projectId/users/userId')
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body).message).toEqual('Cannot read properties of null (reading \'roles\')')
    })

    it('Should not remove an user if requestor is not member himself', async () => {
      const projectInfos = createRandomDbSetup({}).project

      prisma.project.findUnique.mockResolvedValue(projectInfos)

      const response = await app.inject()
        .delete(`/${projectInfos.id}/users/thisIsAnId`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).message).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
    })

    it('Should not remove an user if user is not member', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(requestor.id, projectInfos.id, 'owner')]
      const userToRemove = getRandomUser()

      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.user.findUnique.mockResolvedValue(userToRemove)

      const response = await app.inject()
        .delete(`/${projectInfos.id}/users/${userToRemove.id}`)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body).message).toEqual('L\'utilisateur n\'est pas membre du projet')
    })
  })
})
