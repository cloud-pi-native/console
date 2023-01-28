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

vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => vi.fn()) }))
vi.mock('../ansible.js')

const app = fastify({ logger: false })
  .register(fastifyCookie)
  .register(fastifySession, sessionConf)

const mockSessionPlugin = (app, opt, next) => {
  app.addHook('onRequest', (req, res, next) => {
    req.session = { user: getOwner() }
    next()
  })
  next()
}

const mockSession = (app) => {
  app.register(fp(mockSessionPlugin))
    .register(projectEnvironmentRouter)
}

const owner = {}
const setOwnerId = (id) => {
  owner.id = id
}

const getOwner = () => {
  return owner
}

describe('User routes', () => {
  let Role
  let Environment
  let Permission
  let Project

  beforeAll(async () => {
    mockSession(app)
    await getConnection()
    Project = getProjectModel()
    Role = getUsersProjectsModel()
    Environment = getEnvironmentModel()
    Permission = getPermissionModel()
    global.fetch = vi.fn(() => Promise.resolve())
  })

  afterAll(async () => {
    return closeConnections()
  })

  afterEach(() => {
    vi.clearAllMocks()
    sequelize.$clearQueue()
    global.fetch = vi.fn(() => Promise.resolve())
  })

  // GET
  describe('getEnvironmentByIdController', () => {
    it('Should retreive an environment by its id', async () => {
      const randomDbSetup = createRandomDbSetup({})

      Environment.$queueResult(randomDbSetup.environments[0])
      Role.$queueResult(randomDbSetup.usersProjects[0])
      Permission.$queueResult(randomDbSetup.permissions[0][0])
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .get(`/${randomDbSetup.project.id}/environments/${randomDbSetup.environments[0].id}`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toEqual(randomDbSetup.environments[0])
    })

    it('Should not retreive an environment if requestor is not member of project', async () => {
      const randomDbSetup = createRandomDbSetup({})

      Environment.$queueResult(randomDbSetup.environments[0])
      Role.$queueResult(null)
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .get(`/${randomDbSetup.project.id}/environments/${randomDbSetup.environments[0].id}`)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Requestor is not member of env\'s project')
    })

    it('Should not retreive an environment if requestor has no permission', async () => {
      const randomDbSetup = createRandomDbSetup({})
      randomDbSetup.usersProjects[0].role = 'user'

      Environment.$queueResult(randomDbSetup.environments[0])
      Role.$queueResult(randomDbSetup.usersProjects[0])
      Permission.$queueResult(null)
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .get(`/${randomDbSetup.project.id}/environments/${randomDbSetup.environments[0].id}`)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Requestor is not owner and has no rights on this environment')
    })
  })

  // POST
  describe('environmentInitializingController', () => {
    it('Should create an environment', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const newEnvironment = getRandomEnv('dev', randomDbSetup.project.id)
      delete newEnvironment.id
      delete newEnvironment.status

      // 1. getProjectById
      Project.$queueResult(randomDbSetup.project)
      // 2. getRequestorRole
      Role.$queueResult(randomDbSetup.usersProjects[0])
      // 3. getExistingEnvironments
      Environment.$queueResult(null)
      // 4. createEnvironment
      Environment.$queueResult(newEnvironment)
      // 5. projectLocked
      sequelize.$queueResult([1])
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .post(`/${randomDbSetup.project.id}/environments`)
        .body(newEnvironment)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.json()).toBeDefined()
      expect(response.json()).toMatchObject(newEnvironment)
    })

    it('Should not create an environment if requestor is not member of project', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const newEnvironment = getRandomEnv('dev', randomDbSetup.project.id)
      delete newEnvironment.id
      delete newEnvironment.status

      // 1. getProjectById
      Project.$queueResult(randomDbSetup.project)
      // 2. getRequestorRole
      Role.$queueResult(null)
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .post(`/${randomDbSetup.project.id}/environments`)
        .body(newEnvironment)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Requestor is not member of project')
    })

    it('Should not create an environment if name already present', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const newEnvironment = randomDbSetup.environments[0]

      // 1. getProjectById
      Project.$queueResult(randomDbSetup.project)
      // 2. getRequestorRole
      Role.$queueResult(randomDbSetup.usersProjects[0])
      // 3. getExistingEnvironments
      Environment.$queueResult(randomDbSetup.environments)
      // 4. createEnvironment
      Environment.$queueResult(newEnvironment)
      // 5. projectLocked
      sequelize.$queueResult([1])
      setOwnerId(randomDbSetup.owner.id)

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
  describe('environmentDeletingController', () => {
    it('Should delete an environment', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const environmentToDelete = randomDbSetup.environments[0]

      // 1. getRequestorRole
      Role.$queueResult(randomDbSetup.usersProjects[0])
      // 2. deleteEnvironment
      Environment.$queueResult(randomDbSetup.environments[0])
      // 3. projectLocked
      sequelize.$queueResult([1])
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}/environments/${environmentToDelete.id}`)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.json()).toBeDefined()
      expect(response.json()).toEqual(environmentToDelete)
    })

    it('Should not delete an environment if requestor is not member of project', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const environmentToDelete = randomDbSetup.environments[0]

      // 1. getRequestorRole
      Role.$queueResult(null)
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}/environments/${environmentToDelete.id}`)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Requestor is not member of project')
    })

    it('Should not delete an environment if requestor is not owner of project', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const environmentToDelete = randomDbSetup.environments[0]
      const requestorRole = randomDbSetup.usersProjects[0]
      requestorRole.role = 'user'

      // 1. getRequestorRole
      Role.$queueResult(requestorRole)
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}/environments/${environmentToDelete.id}`)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Requestor is not owner of project')
    })
  })
})