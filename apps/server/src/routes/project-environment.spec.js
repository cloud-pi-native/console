import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { createRandomDbSetup, getRandomEnv } from 'test-utils'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '../utils/keycloak.js'
import { getConnection, closeConnections, sequelize } from '../connect.js'
import projectEnvironmentRouter from './project-environment.js'
import { getUsersProjectsModel } from '../models/users-projects.js'
import { getEnvironmentModel } from '../models/environment.js'
import { getPermissionModel } from '../models/permission.js'
import { getProjectModel } from '../models/project.js'
import { getOrganizationModel } from '../models/organization.js'

vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => vi.fn()) }))

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
    .register(projectEnvironmentRouter)
}

const requestor = {}
const setRequestorId = (id) => {
  requestor.id = id
}

const getRequestor = () => {
  return requestor
}

describe('User routes', () => {
  let Role
  let Environment
  let Permission
  let Project
  let Organization

  beforeAll(async () => {
    mockSession(app)
    await getConnection()
    Project = getProjectModel()
    Role = getUsersProjectsModel()
    Environment = getEnvironmentModel()
    Permission = getPermissionModel()
    Organization = getOrganizationModel()
    global.fetch = vi.fn(() => Promise.resolve())
  })

  afterAll(async () => {
    return closeConnections()
  })

  afterEach(() => {
    vi.clearAllMocks()
    sequelize.$clearQueue()
    global.fetch = vi.fn(() => Promise.resolve({ json: async () => {} }))
  })

  // GET
  describe('getEnvironmentByIdController', () => {
    it('Should retreive an environment by its id', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      Environment.$queueResult(randomDbSetup.project.environments[0])
      Role.$queueResult({ UserId: owner.id, role: 'owner' })
      Permission.$queueResult(randomDbSetup.project.environments[0].permissions[0])
      setRequestorId(owner.id)

      const response = await app.inject()
        .get(`/${randomDbSetup.project.id}/environments/${randomDbSetup.project.environments[0].id}`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toEqual(randomDbSetup.project.environments[0])
    })

    it('Should not retreive an environment if Vous n\'êtes pas membre du projet', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      Environment.$queueResult(randomDbSetup.project.environments[0])
      Role.$queueResult(null)
      setRequestorId(owner.id)

      const response = await app.inject()
        .get(`/${randomDbSetup.project.id}/environments/${randomDbSetup.project.environments[0].id}`)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Vous n\'êtes pas membre du projet')
    })

    it('Should not retreive an environment if requestor has no permission', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')
      randomDbSetup.project.users[0].role = 'user'

      Environment.$queueResult(randomDbSetup.project.environments[0])
      Role.$queueResult({ UserId: owner.id, role: 'user' })
      Permission.$queueResult(null)
      setRequestorId(owner.id)

      const response = await app.inject()
        .get(`/${randomDbSetup.project.id}/environments/${randomDbSetup.project.environments[0].id}`)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Vous n\'êtes pas souscripteur et n\'avez pas accès à cet environnement')
    })
  })

  // POST
  describe('initializeEnvironmentController', () => {
    it('Should create an environment', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const newEnvironment = getRandomEnv('dev', randomDbSetup.project.id)
      delete newEnvironment.id
      delete newEnvironment.status
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      // getProjectById
      Project.$queueResult(randomDbSetup.project)
      // getOrganization
      Organization.$queueResult(randomDbSetup.organization)
      // getRequestorRole
      Role.$queueResult({ UserId: owner.id, role: 'owner' })
      // getExistingEnvironments
      Environment.$queueResult(null)
      // createEnvironment
      Environment.$queueResult(newEnvironment)
      // lockProject
      Project.$queueResult([1])
      setRequestorId(owner.id)

      const response = await app.inject()
        .post(`/${randomDbSetup.project.id}/environments`)
        .body(newEnvironment)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.json()).toBeDefined()
      expect(response.json()).toMatchObject(newEnvironment)
    })

    it('Should not create an environment if Vous n\'êtes pas membre du projet', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const newEnvironment = getRandomEnv('dev', randomDbSetup.project.id)
      delete newEnvironment.id
      delete newEnvironment.status
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      // getProjectById
      Project.$queueResult(randomDbSetup.project)
      // getOrganization
      Organization.$queueResult(randomDbSetup.organization)
      // getRequestorRole
      Role.$queueResult(null)

      setRequestorId(owner.id)

      const response = await app.inject()
        .post(`/${randomDbSetup.project.id}/environments`)
        .body(newEnvironment)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Vous n\'êtes pas membre du projet')
    })

    it('Should not create an environment if name already present', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const newEnvironment = randomDbSetup.project.environments[0]
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      // getProjectById
      Project.$queueResult(randomDbSetup.project)
      // getOrganization
      Organization.$queueResult(randomDbSetup.organization)
      // getRequestorRole
      Role.$queueResult({ UserId: owner.id, role: 'owner' })
      // getExistingEnvironments
      Environment.$queueResult(randomDbSetup.project.environments)
      // createEnvironment
      Environment.$queueResult(newEnvironment)
      // lockProject
      sequelize.$queueResult([1])
      setRequestorId(owner.id)

      const response = await app.inject()
        .post(`/${randomDbSetup.project.id}/environments`)
        .body(newEnvironment)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Requested environment already exists for this project')
    })
  })

  // DELETE
  describe('deleteEnvironmentController', () => {
    it('Should delete an environment', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const environmentToDelete = randomDbSetup.project.environments[0]
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      // 1. getRequestorRole
      Role.$queueResult({ UserId: owner.id, role: 'owner' })
      // 2. deleteEnvironment
      Environment.$queueResult(randomDbSetup.project.environments[0])
      // 3. lockProject
      sequelize.$queueResult([1])
      setRequestorId(owner.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}/environments/${environmentToDelete.id}`)
        .end()

      expect(response.statusCode).toEqual(200)
    })

    it('Should not delete an environment if Vous n\'êtes pas membre du projet', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const environmentToDelete = randomDbSetup.project.environments[0]
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      // 1. getRequestorRole
      Role.$queueResult(null)
      setRequestorId(owner.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}/environments/${environmentToDelete.id}`)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Vous n\'êtes pas membre du projet')
    })

    it('Should not delete an environment if Vous n\'êtes pas souscripteur du projet', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const environmentToDelete = randomDbSetup.project.environments[0]
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')
      const requestor = randomDbSetup.project.users[0]
      requestor.role = 'user'

      // 1. getRequestorRole
      Role.$queueResult({ UserId: requestor.id, role: requestor.role })
      setRequestorId(owner.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}/environments/${environmentToDelete.id}`)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Vous n\'êtes pas souscripteur du projet')
    })
  })
})
