import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { createRandomDbSetup } from 'test-utils'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '../utils/keycloak.js'
import { getConnection, closeConnections } from '../connect.js'
import projectPermissionRouter from './project-permission.js'

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
    .register(projectPermissionRouter)
}

const requestor = {}
const setRequestorId = (id) => {
  requestor.id = id
}

const getRequestor = () => {
  return requestor
}

describe.skip('Project routes', () => {
  beforeAll(async () => {
    mockSession(app)
    await getConnection()
    global.fetch = vi.fn(() => Promise.resolve())
  })

  afterAll(async () => {
    return closeConnections()
  })

  afterEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn(() => Promise.resolve({ json: async () => { } }))
  })

  // GET
  describe('getEnvironmentPermissionsController', () => {
    it('Should retrieve permissions for an environment', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      setRequestorId(owner.id)

      const response = await app.inject()
        .get(`/${randomDbSetup.project.id}/environments/${randomDbSetup.project.environments[0].id}/permissions`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual(randomDbSetup.project.environments[0].permissions[0])
    })

    it('Should not retrieve permissions for an environment if requestor is not member', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      setRequestorId(owner.id)

      const response = await app.inject()
        .get(`/${randomDbSetup.project.id}/environments/${randomDbSetup.project.environments[0].id}/permissions`)
        .end()

      expect(response.statusCode).toEqual(404)
      expect(response.body).toEqual('Echec de la récupération des permissions de l\'environnement')
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

      setRequestorId(owner.id)

      const response = await app.inject()
        .post(`/${randomDbSetup.project.id}/environments/${randomDbSetup.project.environments[0].id}/permissions`)
        .body(newPermission)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.json()).toBeDefined()
      expect(response.json()).toMatchObject(newPermission)
    })

    it('Should not set a permission if not project member', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const newPermission = randomDbSetup.project.environments[0].permissions[0]
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      setRequestorId(owner.id)

      const response = await app.inject()
        .post(`/${randomDbSetup.project.id}/environments/${randomDbSetup.project.environments[0].id}/permissions`)
        .body(newPermission)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Echec de la création d\'une permission')
    })
  })

  // PUT
  describe('updatePermissionController', () => {
    it('Should update a permission', async () => {
      const randomDbSetup = createRandomDbSetup({ nbUsers: 2 })
      const requestorPermission = randomDbSetup.project.environments[0].permissions[0]
      const permissionToUpdate = randomDbSetup.project.environments[0].permissions[1]
      permissionToUpdate.level = 2
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      setRequestorId(owner.id)

      const response = await app.inject()
        .put(`/${randomDbSetup.project.id}/environments/${randomDbSetup.project.environments[0].id}/permissions`)
        .body(permissionToUpdate)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toMatchObject(permissionToUpdate)
    })

    it('Should not update owner permission', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const permissionToUpdate = randomDbSetup.project.environments[0].permissions[0]
      permissionToUpdate.level = 2
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      setRequestorId(owner.id)

      const response = await app.inject()
        .put(`/${randomDbSetup.project.id}/environments/${randomDbSetup.project.environments[0].id}/permissions`)
        .body(permissionToUpdate)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.body).toEqual('Echec de la mise à jour de la permission')
    })

    it('Should not update a permission if not permitted on given environment', async () => {
      const randomDbSetup = createRandomDbSetup({ nbUsers: 3 })
      const permissionToUpdate = randomDbSetup.project.environments[0].permissions[1]
      permissionToUpdate.level = 2
      const requestor = randomDbSetup.users[2]

      setRequestorId(requestor.id)

      const response = await app.inject()
        .put(`/${randomDbSetup.project.id}/environments/${randomDbSetup.project.environments[0].id}/permissions`)
        .body(permissionToUpdate)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.body).toEqual('Echec de la mise à jour de la permission')
    })
  })

  // DELETE
  describe('deletePermissionController', () => {
    it('Should delete a permission', async () => {
      const randomDbSetup = createRandomDbSetup({ nbUsers: 2 })
      const removedPermission = randomDbSetup.project.environments[0].permissions[1]
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      setRequestorId(owner.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}/environments/${randomDbSetup.project.environments[0].id}/permissions/${removedPermission.userId}`)
        .body(removedPermission)
        .end()

      expect(response.statusCode).toEqual(200)
    })

    it('Should not delete owner permission', async () => {
      const randomDbSetup = createRandomDbSetup({ nbUsers: 2 })
      const requestorPermission = randomDbSetup.project.environments[0].permissions[1]
      const removedPermission = randomDbSetup.project.environments[0].permissions[0]
      const requestor = randomDbSetup.project.users[1]
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      setRequestorId(owner.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}/environments/${randomDbSetup.project.environments[0].id}/permissions/${removedPermission.userId}`)
        .body(removedPermission)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toEqual('Echec de la suppression de la permission')
    })

    it('Should not delete permission if not permitted on given environment', async () => {
      const randomDbSetup = createRandomDbSetup({ nbUsers: 3 })
      const removedPermission = randomDbSetup.project.environments[0].permissions[1]
      const requestor = randomDbSetup.users[2]

      setRequestorId(requestor.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}/environments/${randomDbSetup.project.environments[0].id}/permissions/${removedPermission.userId}`)
        .body(removedPermission)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toEqual('Echec de la suppression de la permission')
    })
  })
})
