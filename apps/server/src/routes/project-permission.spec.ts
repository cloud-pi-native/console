import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { User, createRandomDbSetup, getRandomPerm, getRandomRole, getRandomUser } from 'test-utils'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '../utils/keycloak.js'
import { getConnection, closeConnections } from '../connect.js'
import projectPermissionRouter from './project-permission.js'
import prisma from '../__mocks__/prisma.js'

vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => vi.fn()) }))
vi.mock('../prisma')

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

let requestor: User

const setRequestor = (user: User) => {
  requestor = user
}

const getRequestor = () => {
  return requestor
}

describe('Permission routes', () => {
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
  describe('getEnvironmentPermissionsController', () => {
    it('Should retrieve permissions for an environment', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(requestor.id, projectInfos.id, 'owner')]
      const environment = projectInfos.environments[0]
      
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.permission.findMany.mockResolvedValue(environment.permissions)

      const response = await app.inject()
        .get(`/${projectInfos.id}/environments/${environment.id}/permissions`)
        .end()

      expect(response.body).toStrictEqual(JSON.stringify(environment.permissions))
      expect(response.statusCode).toEqual(200)
    })

    it('Should not retrieve permissions for an environment if requestor is not member', async () => {
      const projectInfos = createRandomDbSetup({}).project
      const environment = projectInfos.environments[0]
      
      prisma.project.findUnique.mockResolvedValue(projectInfos)

      const response = await app.inject()
        .get(`/${projectInfos.id}/environments/${environment.id}/permissions`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).message).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
    })
  })

  // POST
  describe('setPermissionController', () => {
    it('Should set a permission', async () => {
      const projectInfos = createRandomDbSetup({}).project
      const newMember = getRandomUser()
      const newRole = getRandomRole(newMember.id, projectInfos.id)
      projectInfos.roles = [...projectInfos.roles, getRandomRole(requestor.id, projectInfos.id, 'owner'), newRole]
      const environment = projectInfos.environments[0]
      const permissionToAdd = getRandomPerm(environment.id, newMember)
      
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.permission.create.mockResolvedValue(permissionToAdd)

      const response = await app.inject()
      .post(`/${projectInfos.id}/environments/${environment.id}/permissions`)
      .body(permissionToAdd)
      .end()
      
      expect(response.statusCode).toEqual(201)
      expect(response.body).toStrictEqual(JSON.stringify(permissionToAdd))
    })

    it('Should not set a permission if requestor is not project member', async () => {
      const projectInfos = createRandomDbSetup({}).project
      const newMember = getRandomUser()
      const environment = projectInfos.environments[0]
      const permissionToAdd = getRandomPerm(environment.id, newMember)
      
      prisma.project.findUnique.mockResolvedValue(projectInfos)

      const response = await app.inject()
      .post(`/${projectInfos.id}/environments/${environment.id}/permissions`)
      .body(permissionToAdd)
      .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).message).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
        })
    
    it('Should not set a permission if user is not project member', async () => {
      const projectInfos = createRandomDbSetup({}).project
      const newMember = getRandomUser()
      projectInfos.roles = [...projectInfos.roles, getRandomRole(requestor.id, projectInfos.id, 'owner')]
      const environment = projectInfos.environments[0]
      const permissionToAdd = getRandomPerm(environment.id, newMember)
      
      prisma.project.findUnique.mockResolvedValue(projectInfos)

      const response = await app.inject()
      .post(`/${projectInfos.id}/environments/${environment.id}/permissions`)
      .body(permissionToAdd)
      .end()
  
      expect(response.statusCode).toEqual(400)
      expect(JSON.parse(response.body).message).toEqual('L\'utilisateur n\'est pas membre du projet')
    })
  })

  // PUT
  describe('updatePermissionController', () => {
    it('Should update a permission', async () => {
      const projectInfos = createRandomDbSetup({ envs: ['dev'] }).project
      const requestorRole = { ...getRandomRole(requestor.id, projectInfos.id, 'owner'), user: requestor }
      projectInfos.roles = [...projectInfos.roles, requestorRole]
      const environment = projectInfos.environments[0]
      projectInfos.environments[0].permissions = [...environment.permissions, getRandomPerm(environment.id, requestor)]
      const environmentInfos = { ...environment, project: projectInfos}
      const permissionToUpdate = environment.permissions[0]
      
      prisma.environment.findUnique.mockResolvedValue(environmentInfos)
      prisma.role.findFirst.mockResolvedValue(requestorRole)
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.permission.update.mockResolvedValue(permissionToUpdate)

      const response = await app.inject()
      .put(`/${projectInfos.id}/environments/${environment.id}/permissions`)
      .body(permissionToUpdate)
      .end()
      
      expect(response.statusCode).toEqual(200)
      expect(response.body).toStrictEqual(JSON.stringify(permissionToUpdate))
    })

    it('Should not update owner permission', async () => {
      const projectInfos = createRandomDbSetup({ envs: ['dev'] }).project
      const requestorRole = { ...getRandomRole(requestor.id, projectInfos.id, 'owner'), user: requestor }
      projectInfos.roles = [...projectInfos.roles, requestorRole]
      const environment = projectInfos.environments[0]
      projectInfos.environments[0].permissions = [getRandomPerm(environment.id, requestor), ...environment.permissions]
      const environmentInfos = { ...environment, project: projectInfos}
      const permissionToUpdate = environment.permissions[0]
      
      prisma.environment.findUnique.mockResolvedValue(environmentInfos)
      prisma.role.findFirst.mockResolvedValue(requestorRole)

      const response = await app.inject()
      .put(`/${projectInfos.id}/environments/${environment.id}/permissions`)
      .body(permissionToUpdate)
      .end()
      
      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).message).toStrictEqual('La permission du owner du projet ne peut être modifiée')
    })

    it('Should not update a permission if not permitted on given environment', async () => {
      const projectInfos = createRandomDbSetup({ envs: ['dev'] }).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(requestor.id, projectInfos.id, 'owner')]
      const environment = projectInfos.environments[0]
      const environmentInfos = { ...environment, project: projectInfos}
      const permissionToUpdate = environment.permissions[0]
      
      prisma.environment.findUnique.mockResolvedValue(environmentInfos)

      const response = await app.inject()
      .put(`/${projectInfos.id}/environments/${environment.id}/permissions`)
      .body(permissionToUpdate)
      .end()
      
      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).message).toStrictEqual('Vous n\'avez pas les droits suffisants pour requêter cet environnement')
    })
  })

  // DELETE
  describe('deletePermissionController', () => {
    it('Should delete a permission', async () => {
      const projectInfos = createRandomDbSetup({ envs: ['dev'] }).project
      const requestorRole = { ...getRandomRole(requestor.id, projectInfos.id, 'owner'), user: requestor }
      projectInfos.roles = [...projectInfos.roles, requestorRole]
      const environment = projectInfos.environments[0]
      projectInfos.environments[0].permissions = [...environment.permissions, getRandomPerm(environment.id, requestor)]
      const environmentInfos = { ...environment, project: projectInfos}
      const permissionToDelete = environment.permissions[0]
      
      prisma.environment.findUnique.mockResolvedValue(environmentInfos)
      prisma.role.findFirst.mockResolvedValue(requestorRole)
      prisma.permission.deleteMany.mockResolvedValue(permissionToDelete)

      const response = await app.inject()
      .delete(`/${projectInfos.id}/environments/${environment.id}/permissions/${permissionToDelete.userId}`)
      .end()
      
      expect(response.statusCode).toEqual(200)
      expect(response.body).toStrictEqual(JSON.stringify(permissionToDelete))
    })

    it('Should not delete owner permission', async () => {
      const projectInfos = createRandomDbSetup({ envs: ['dev'] }).project
      const requestorRole = { ...getRandomRole(requestor.id, projectInfos.id, 'owner'), user: requestor }
      projectInfos.roles = [...projectInfos.roles, requestorRole]
      const environment = projectInfos.environments[0]
      projectInfos.environments[0].permissions = [getRandomPerm(environment.id, requestor), ...environment.permissions]
      const environmentInfos = { ...environment, project: projectInfos}
      const permissionToDelete = environment.permissions[0]
      
      prisma.environment.findUnique.mockResolvedValue(environmentInfos)
      prisma.role.findFirst.mockResolvedValue(requestorRole)
      prisma.permission.deleteMany.mockResolvedValue(permissionToDelete)

      const response = await app.inject()
      .delete(`/${projectInfos.id}/environments/${environment.id}/permissions/${requestor.id}`)
      .end()
      
      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).message).toStrictEqual('La permission du owner du projet ne peut être supprimée')
    })

    it('Should not delete permission if not permitted on given environment', async () => {
      const projectInfos = createRandomDbSetup({ envs: ['dev'] }).project
      const requestorRole = { ...getRandomRole(requestor.id, projectInfos.id, 'owner'), user: requestor }
      projectInfos.roles = [...projectInfos.roles, requestorRole]
      const environment = projectInfos.environments[0]
      const environmentInfos = { ...environment, project: projectInfos}
      const permissionToDelete = environment.permissions[0]
      
      prisma.environment.findUnique.mockResolvedValue(environmentInfos)

      const response = await app.inject()
      .delete(`/${projectInfos.id}/environments/${environment.id}/permissions/${permissionToDelete.userId}`)
      .end()
      
      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).message).toStrictEqual('Vous n\'avez pas les droits suffisants pour requêter cet environnement')
    })
  })
})
