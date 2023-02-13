import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { createRandomDbSetup } from 'test-utils'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '../utils/keycloak.js'
import { getConnection, closeConnections, sequelize } from '../connect.js'
import projectPermissionRouter from './project-permission.js'
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
    .register(projectPermissionRouter)
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
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      // 1. getRequestorRole
      Role.$queueResult(randomDbSetup.project.users[0])
      // 2. getPermissions
      Permission.$queueResult(randomDbSetup.project.environments[0].permissions[0])
      setOwnerId(owner.id)

      const response = await app.inject()
        .get(`/${randomDbSetup.project.id}/environments/${randomDbSetup.project.environments[0].id}/permissions`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual(randomDbSetup.project.environments[0].permissions[0])
    })
    it('Should not retrieve permissions for an environment if requestor is not member', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      // 1. getRequestorRole
      Role.$queueResult(null)
      setOwnerId(owner.id)

      const response = await app.inject()
        .get(`/${randomDbSetup.project.id}/environments/${randomDbSetup.project.environments[0].id}/permissions`)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toEqual('Cannot retrieve permissions: Requestor is not member of project')
    })
  })

  // POST
  describe('setPermissionController', () => {
    it('Should set a permission', async () => {
      const randomDbSetup = createRandomDbSetup({ nbUsers: 2 })
      const newPermission = {
        userId: randomDbSetup.users[1].id,
        environmentId: randomDbSetup.project.environments[0].id,
        level: 2,
      }
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      // 1. getRequestorRole
      Role.$queueResult(randomDbSetup.project.users[0])
      // 2. setPermissions
      sequelize.$queueResult(newPermission)
      setOwnerId(owner.id)

      const response = await app.inject()
        .post(`/${randomDbSetup.project.id}/environments/${randomDbSetup.project.environments[0].id}/permissions`)
        .body(newPermission)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.json()).toBeDefined()
      expect(response.json()).toMatchObject(newPermission)
    })
    it('Should not set a permission if requestor is not member of project', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const newPermission = randomDbSetup.project.environments[0].permissions[0]
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      // 1. getRequestorRole
      Role.$queueResult(null)
      setOwnerId(owner.id)

      const response = await app.inject()
        .post(`/${randomDbSetup.project.id}/environments/${randomDbSetup.project.environments[0].id}/permissions`)
        .body(newPermission)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Cannot create permissions: Requestor is not member of project')
    })
  })

  // PUT
  describe('updatePermissionController', () => {
    it('Should update a permission', async () => {
      const randomDbSetup = createRandomDbSetup({ nbUsers: 2 })
      const permissionToUpdate = randomDbSetup.project.environments[0].permissions[1]
      permissionToUpdate.level = 2
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')
      // 1. getRequestorRole
      Role.$queueResult(randomDbSetup.project.users[0])
      // 2. getOwnerId
      sequelize.$queueResult(owner.id)
      // 3. setPermissions
      Permission.$queueResult(permissionToUpdate)
      setOwnerId(owner.id)

      const response = await app.inject()
        .put(`/${randomDbSetup.project.id}/environments/${randomDbSetup.project.environments[0].id}/permissions`)
        .body(permissionToUpdate)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toMatchObject(permissionToUpdate)
    })
    it.skip('Should not update owner permission', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const permissionToUpdate = randomDbSetup.project.environments[0].permissions[0]
      permissionToUpdate.level = 2
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      // 1. getRequestorRole
      Role.$queueResult(randomDbSetup.project.users[0])
      // 2. getOwnerId
      // TODO : ownerId = undefined
      Role.$queueResult(owner.id)
      setOwnerId(owner.id)

      const response = await app.inject()
        .put(`/${randomDbSetup.project.id}/environments/${randomDbSetup.project.environments[0].id}/permissions`)
        .body(permissionToUpdate)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toEqual('La permission du owner du projet ne peut être modifiée')
    })
  })

  // DELETE
  describe('deletePermissionController', () => {
    it('Should delete a permission', async () => {
      const randomDbSetup = createRandomDbSetup({ nbUsers: 2 })
      const removedPermission = randomDbSetup.project.environments[0].permissions[1]
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      // 1. getRequestorRole
      Role.$queueResult(randomDbSetup.project.users[0])
      // 2. getOwnerId
      Role.$queueResult(owner.id)
      // 3. deletePermissions
      Permission.$queueResult(removedPermission.id)
      setOwnerId(owner.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}/environments/${randomDbSetup.project.environments[0].id}/permissions/${removedPermission.userId}`)
        .body(removedPermission)
        .end()

      expect(response.statusCode).toEqual(200)
    })
    it.skip('Should not delete owner permission', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const removedPermission = randomDbSetup.project.environments[0].permissions[0]
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      // 1. getRequestorRole
      Role.$queueResult(randomDbSetup.project.users[0])
      // 2. getOwnerId
      // TODO : ownerId = undefined
      Role.$queueResult(owner.id)
      setOwnerId(owner.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}/environments/${randomDbSetup.project.environments[0].id}/permissions/${removedPermission.userId}`)
        .body(removedPermission)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toEqual('La permission du owner du projet ne peut être supprimée')
    })
  })
})
