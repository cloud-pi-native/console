import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { createRandomDbSetup } from 'test-utils'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '../utils/keycloak.js'
import { getConnection, closeConnections, sequelize } from '../connect.js'
import permissionRouter from './permission.js'
import { getUsersProjectsModel } from '../models/users-projects.js'
import { getPermissionModel } from '../models/permission.js'

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
    .register(permissionRouter)
}

const owner = {}
const setOwnerId = (id) => {
  owner.id = id
}

const getOwner = () => {
  return owner
}

describe('Project routes', () => {
  let Role
  let Permission

  beforeAll(async () => {
    mockSession(app)
    await getConnection()
    Role = getUsersProjectsModel()
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
  describe('getEnvironmentPermissionsController', () => {
    it('Should retrieve permissions for an environment', async () => {
      const randomDbSetup = createRandomDbSetup({})

      // 1. getRequestorRole
      Role.$queueResult(randomDbSetup.usersProjects[0])
      // 2. getPermissions
      Permission.$queueResult(randomDbSetup.permissions[0])
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .get(`${randomDbSetup.project.id}/environments/${randomDbSetup.environments[0].id}/permissions`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual(randomDbSetup.permissions[0])
    })

    it('Should not retrieve permissions for an environment if requestor is not member', async () => {
      const randomDbSetup = createRandomDbSetup({})

      // 1. getRequestorRole
      Role.$queueResult(null)
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .get(`${randomDbSetup.project.id}/environments/${randomDbSetup.environments[0].id}/permissions`)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toEqual('Cannot retrieve permissions: Requestor is not member of project')
    })
  })

  describe('setEnvironmentPermissionController', () => {
    it('Should set a permission', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const newPermission = randomDbSetup.permissions[0][0]

      // 1. getRequestorRole
      Role.$queueResult(randomDbSetup.usersProjects[0])
      // 2. setPermissions
      Permission.$queueResult(newPermission)
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .post(`${randomDbSetup.project.id}/environments/${randomDbSetup.environments[0].id}/permissions`)
        .body(newPermission)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.json()).toBeDefined()
      expect(response.json()).toEqual(newPermission)
    })

    it('Should not set a permission if requestor is not member of project', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const newPermission = randomDbSetup.permissions[0][0]

      // 1. getRequestorRole
      Role.$queueResult(null)
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .post(`${randomDbSetup.project.id}/environments/${randomDbSetup.environments[0].id}/permissions`)
        .body(newPermission)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Cannot create permissions: Requestor is not member of project')
    })
  })
})
