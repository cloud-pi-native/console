import prisma from '../../__mocks__/prisma.js'
import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { createRandomDbSetup, getRandomPerm, getRandomRole, getRandomUser } from '@cpn-console/test-utils'
import { getConnection, closeConnections } from '../../connect.js'
import { getRequestor, setRequestor } from '../../utils/mocks.js'
import app from '../../app.js'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks.js')).mockSessionPlugin)
vi.mock('../../utils/hook-wrapper.js', (await import('../../utils/mocks.js')).mockHookWrapper)

describe('Permission routes', () => {
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
  describe('getEnvironmentPermissionsController', () => {
    it('Should retrieve permissions for an environment', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      const environment = projectInfos.environments[0]

      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.permission.findMany.mockResolvedValue(environment.permissions)

      const response = await app.inject()
        .get(`/api/v1/projects/${projectInfos.id}/environments/${environment.id}/permissions`)
        .end()

      expect(response.json()).toStrictEqual(environment.permissions)
      expect(response.statusCode).toEqual(200)
    })

    it('Should not retrieve permissions for an environment if requestor is not member', async () => {
      const projectInfos = createRandomDbSetup({}).project
      const environment = projectInfos.environments[0]

      prisma.project.findUnique.mockResolvedValue(projectInfos)

      const response = await app.inject()
        .get(`/api/v1/projects/${projectInfos.id}/environments/${environment.id}/permissions`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).error).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
    })
  })

  // PUT
  describe('upsertPermissionController', () => {
    it('Should update a permission', async () => {
      const dbSetup = createRandomDbSetup({ envs: ['dev'] })
      const projectInfos = dbSetup.project
      const requestorRole = { ...getRandomRole(getRequestor().id, projectInfos.id, 'owner'), user: requestor }
      projectInfos.roles = projectInfos.roles ? [...projectInfos.roles.map(({ role: _, ...details }) => ({ ...details, role: 'user' })), requestorRole] : []
      const environment = projectInfos.environments[0]
      const requestorPermission = getRandomPerm(environment.id, requestor, 1)
      projectInfos.environments[0].permissions = [...environment.permissions, getRandomPerm(environment.id, requestor)]
      const permissionToUpdate = environment.permissions[0]
      projectInfos.roles[0].role = 'user'

      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.permission.findUnique.mockResolvedValue(requestorPermission)
      prisma.permission.upsert.mockResolvedValue(permissionToUpdate)

      const response = await app.inject()
        .put(`/api/v1/projects/${projectInfos.id}/environments/${environment.id}/permissions`)
        .body(permissionToUpdate)
        .end()

      expect(response.json()).toStrictEqual(permissionToUpdate)
      expect(response.statusCode).toEqual(200)
    })

    it('Should not update owner permission if level <= 2', async () => {
      const projectInfos = createRandomDbSetup({ envs: ['dev'] }).project
      const environment = projectInfos.environments[0]
      const requestorRole = { ...getRandomRole(getRequestor().id, projectInfos.id), user: requestor }
      const requestorPermission = getRandomPerm(environment.id, requestor, 2)
      projectInfos.roles = [...projectInfos.roles, requestorRole]
      projectInfos.environments[0].permissions = [...environment.permissions, requestorPermission]
      const permissionToUpdate = { ...environment.permissions[0], level: 0 }

      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.permission.findUnique.mockResolvedValue(requestorPermission)
      prisma.permission.upsert.mockResolvedValue(permissionToUpdate)

      const response = await app.inject()
        .put(`/api/v1/projects/${projectInfos.id}/environments/${environment.id}/permissions`)
        .body(permissionToUpdate)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).error).toStrictEqual('La permission du owner du projet ne peut être inférieure à rwd')
    })

    it('Should not update a permission if not permitted on given environment', async () => {
      const projectInfos = createRandomDbSetup({ envs: ['dev'] }).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'user')]
      const requestorRole = { ...getRandomRole(getRequestor().id, projectInfos.id, 'user'), user: requestor }
      const environment = projectInfos.environments[0]
      const environmentInfos = { ...environment, project: projectInfos }
      const permissionToUpdate = environment.permissions[0]

      prisma.environment.findUnique.mockResolvedValue(environmentInfos)
      prisma.role.findFirst.mockResolvedValue(requestorRole)
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.permission.findUnique.mockResolvedValue(null)

      const response = await app.inject()
        .put(`/api/v1/projects/${projectInfos.id}/environments/${environment.id}/permissions`)
        .body(permissionToUpdate)
        .end()

      expect(JSON.parse(response.body).error).toStrictEqual('Vous n\'avez pas de droits sur cet environnement')
      expect(response.statusCode).toEqual(403)
    })
  })

  // DELETE
  describe('deletePermissionController', () => {
    it('Should delete a permission', async () => {
      const projectInfos = createRandomDbSetup({ envs: ['dev'] }).project
      const requestorRole = { ...getRandomRole(getRequestor().id, projectInfos.id, 'owner'), user: requestor }
      projectInfos.roles = projectInfos.roles ? [...projectInfos.roles.map(({ role: _, ...details }) => ({ ...details, role: 'user' })), requestorRole] : []
      const environment = projectInfos.environments[0]
      projectInfos.environments[0].permissions = [...environment.permissions, getRandomPerm(environment.id, requestor)]
      const requestorPermission = getRandomPerm(environment.id, requestor, 2)
      const environmentInfos = { ...environment, project: projectInfos }
      const permissionToDelete = environment.permissions[0]

      prisma.environment.findUnique.mockResolvedValue(environmentInfos)
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.user.findUnique.mockResolvedValue(getRequestor())
      prisma.role.findFirst.mockResolvedValue(requestorRole)
      prisma.permission.findUnique.mockResolvedValue(requestorPermission)
      prisma.permission.deleteMany.mockResolvedValue(permissionToDelete)

      const response = await app.inject()
        .delete(`/api/v1/projects/${projectInfos.id}/environments/${environment.id}/permissions/${permissionToDelete.userId}`)
        .end()

      expect(response.body).toStrictEqual('')
      expect(response.statusCode).toEqual(204)
    })

    it('Should not delete owner permission', async () => {
      const projectInfos = createRandomDbSetup({ envs: ['dev'] }).project
      const requestorRole = { ...getRandomRole(getRequestor().id, projectInfos.id, 'owner'), user: requestor }
      projectInfos.roles = [...projectInfos.roles, requestorRole]
      projectInfos.roles[0].role = 'owner'
      const userToDelete = projectInfos.roles[0]
      const environment = projectInfos.environments[0]
      projectInfos.environments[0].permissions = [getRandomPerm(environment.id, requestor), ...environment.permissions]
      const environmentInfos = { ...environment, project: projectInfos }

      prisma.environment.findUnique.mockResolvedValue(environmentInfos)
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.role.findFirst.mockResolvedValue(requestorRole)

      const response = await app.inject()
        .delete(`/api/v1/projects/${projectInfos.id}/environments/${environment.id}/permissions/${userToDelete.userId}`)
        .end()

      expect(JSON.parse(response.body).error).toStrictEqual('La permission du owner du projet ne peut être supprimée')
      expect(response.statusCode).toEqual(403)
    })

    it('Should not delete permission if not permitted on given environment', async () => {
      const projectInfos = createRandomDbSetup({ envs: ['dev'] }).project
      const requestorRole = { ...getRandomRole(getRequestor().id, projectInfos.id, 'user'), user: requestor }
      projectInfos.roles = projectInfos.roles ? [...projectInfos.roles.map(({ role: _, ...details }) => ({ ...details, role: 'user' })), requestorRole] : []
      const environment = projectInfos.environments[0]
      const environmentInfos = { ...environment, project: projectInfos }
      const permissionToDelete = environment.permissions[0]

      prisma.environment.findUnique.mockResolvedValue(environmentInfos)
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.role.findFirst.mockResolvedValue(requestorRole)
      prisma.permission.findUnique.mockResolvedValue({ level: 0 })

      const response = await app.inject()
        .delete(`/api/v1/projects/${projectInfos.id}/environments/${environment.id}/permissions/${permissionToDelete.userId}`)
        .end()

      expect(JSON.parse(response.body).error).toStrictEqual('Vous n\'avez pas de droits sur cet environnement')
      expect(response.statusCode).toEqual(403)
    })
  })
})
