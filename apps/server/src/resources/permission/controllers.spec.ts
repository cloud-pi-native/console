import prisma from '../../__mocks__/prisma.js'
import app, { getRequestor, setRequestor } from '../../__mocks__/app.js'
import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { createRandomDbSetup, getRandomPerm, getRandomRole, getRandomUser } from '@cpn-console/test-utils'
import { getConnection, closeConnections } from '../../connect.js'

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
      expect(response.json().message).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
    })
  })

  // POST
  describe('setPermissionController', () => {
    it('Should set a permission', async () => {
      const projectInfos = createRandomDbSetup({}).project
      const newMember = getRandomUser()
      const newRole = getRandomRole(newMember.id, projectInfos.id)
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner'), newRole]
      const environment = projectInfos.environments[0]
      const permissionToAdd = getRandomPerm(environment.id, newMember)

      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.permission.create.mockResolvedValue(permissionToAdd)
      prisma.environment.findUnique.mockResolvedValue(environment)
      prisma.user.findUnique.mockResolvedValue(newMember)

      const response = await app.inject()
        .post(`/api/v1/projects/${projectInfos.id}/environments/${environment.id}/permissions`)
        .body(permissionToAdd)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.json()).toStrictEqual(permissionToAdd)
    })

    it('Should not set a permission if requestor is not project member', async () => {
      const projectInfos = createRandomDbSetup({}).project
      const newMember = getRandomUser()
      const environment = projectInfos.environments[0]
      const permissionToAdd = getRandomPerm(environment.id, newMember)

      prisma.project.findUnique.mockResolvedValue(projectInfos)

      const response = await app.inject()
        .post(`/api/v1/projects/${projectInfos.id}/environments/${environment.id}/permissions`)
        .body(permissionToAdd)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().message).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
    })

    it('Should not set a permission if user is not project member', async () => {
      const projectInfos = createRandomDbSetup({}).project
      const newMember = getRandomUser()
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      const environment = projectInfos.environments[0]
      const permissionToAdd = getRandomPerm(environment.id, newMember)

      prisma.project.findUnique.mockResolvedValue(projectInfos)

      const response = await app.inject()
        .post(`/api/v1/projects/${projectInfos.id}/environments/${environment.id}/permissions`)
        .body(permissionToAdd)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.json().message).toEqual('L\'utilisateur n\'est pas membre du projet')
    })
  })

  // PUT
  describe('updatePermissionController', () => {
    it('Should update a permission', async () => {
      const projectInfos = createRandomDbSetup({ envs: ['dev'] }).project
      const requestorRole = { ...getRandomRole(getRequestor().id, projectInfos.id, 'owner'), user: requestor }
      projectInfos.roles = [...projectInfos.roles, requestorRole]
      const environment = projectInfos.environments[0]
      const requestorPermission = getRandomPerm(environment.id, requestor)
      projectInfos.environments[0].permissions = [...environment.permissions, getRandomPerm(environment.id, requestor)]
      const environmentInfos = { ...environment, project: projectInfos }
      const permissionToUpdate = environment.permissions[0]

      prisma.environment.findUnique.mockResolvedValue(environmentInfos)
      prisma.role.findFirst.mockResolvedValue(requestorRole)
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.permission.findMany.mockResolvedValue([requestorPermission])
      prisma.permission.update.mockResolvedValue(permissionToUpdate)

      const response = await app.inject()
        .put(`/api/v1/projects/${projectInfos.id}/environments/${environment.id}/permissions`)
        .body(permissionToUpdate)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toStrictEqual(permissionToUpdate)
    })

    it('Should not update owner permission', async () => {
      const projectInfos = createRandomDbSetup({ envs: ['dev'] }).project
      const requestorRole = { ...getRandomRole(getRequestor().id, projectInfos.id, 'owner'), user: requestor }
      projectInfos.roles = [...projectInfos.roles, requestorRole]
      const environment = projectInfos.environments[0]
      projectInfos.environments[0].permissions = [getRandomPerm(environment.id, requestor), ...environment.permissions]
      const permissionToUpdate = environment.permissions[0]

      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.role.findFirst.mockResolvedValue(requestorRole)

      const response = await app.inject()
        .put(`/api/v1/projects/${projectInfos.id}/environments/${environment.id}/permissions`)
        .body(permissionToUpdate)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().message).toStrictEqual('La permission du owner du projet ne peut être modifiée')
    })

    it('Should not update a permission if not permitted on given environment', async () => {
      const projectInfos = createRandomDbSetup({ envs: ['dev'] }).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(getRequestor().id, projectInfos.id, 'owner')]
      const requestorRole = { ...getRandomRole(getRequestor().id, projectInfos.id, 'owner'), user: requestor }
      const environment = projectInfos.environments[0]
      const environmentInfos = { ...environment, project: projectInfos }
      const permissionToUpdate = environment.permissions[0]

      prisma.environment.findUnique.mockResolvedValue(environmentInfos)
      prisma.role.findFirst.mockResolvedValue(requestorRole)
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.permission.findMany.mockResolvedValue([])

      const response = await app.inject()
        .put(`/api/v1/projects/${projectInfos.id}/environments/${environment.id}/permissions`)
        .body(permissionToUpdate)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().message).toStrictEqual('Vous n\'avez pas de droits sur cet environnement')
    })
  })

  // DELETE
  describe('deletePermissionController', () => {
    it('Should delete a permission', async () => {
      const projectInfos = createRandomDbSetup({ envs: ['dev'] }).project
      const requestorRole = { ...getRandomRole(getRequestor().id, projectInfos.id, 'owner'), user: requestor }
      projectInfos.roles = [...projectInfos.roles, requestorRole]
      const environment = projectInfos.environments[0]
      projectInfos.environments[0].permissions = [...environment.permissions, getRandomPerm(environment.id, requestor)]
      const requestorPermission = getRandomPerm(environment.id, requestor)
      const environmentInfos = { ...environment, project: projectInfos }
      const permissionToDelete = environment.permissions[0]

      prisma.environment.findUnique.mockResolvedValue(environmentInfos)
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.user.findUnique.mockResolvedValue(getRequestor())
      prisma.role.findFirst.mockResolvedValue(requestorRole)
      prisma.permission.findMany.mockResolvedValue([requestorPermission])
      prisma.permission.deleteMany.mockResolvedValue(permissionToDelete)

      const response = await app.inject()
        .delete(`/api/v1/projects/${projectInfos.id}/environments/${environment.id}/permissions/${permissionToDelete.userId}`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toStrictEqual(permissionToDelete)
    })

    it('Should not delete owner permission', async () => {
      const projectInfos = createRandomDbSetup({ envs: ['dev'] }).project
      const requestorRole = { ...getRandomRole(getRequestor().id, projectInfos.id, 'owner'), user: requestor }
      projectInfos.roles = [...projectInfos.roles, requestorRole]
      const environment = projectInfos.environments[0]
      projectInfos.environments[0].permissions = [getRandomPerm(environment.id, requestor), ...environment.permissions]
      const environmentInfos = { ...environment, project: projectInfos }

      prisma.environment.findUnique.mockResolvedValue(environmentInfos)
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.role.findFirst.mockResolvedValue(requestorRole)

      const response = await app.inject()
        .delete(`/api/v1/projects/${projectInfos.id}/environments/${environment.id}/permissions/${requestor.id}`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().message).toStrictEqual('La permission du owner du projet ne peut être supprimée')
    })

    it('Should not delete permission if not permitted on given environment', async () => {
      const projectInfos = createRandomDbSetup({ envs: ['dev'] }).project
      const requestorRole = { ...getRandomRole(getRequestor().id, projectInfos.id, 'owner'), user: requestor }
      projectInfos.roles = [...projectInfos.roles, requestorRole]
      const environment = projectInfos.environments[0]
      const environmentInfos = { ...environment, project: projectInfos }
      const permissionToDelete = environment.permissions[0]

      prisma.environment.findUnique.mockResolvedValue(environmentInfos)
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.role.findFirst.mockResolvedValue(requestorRole)
      prisma.permission.findMany.mockResolvedValue([])

      const response = await app.inject()
        .delete(`/api/v1/projects/${projectInfos.id}/environments/${environment.id}/permissions/${permissionToDelete.userId}`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().message).toStrictEqual('Vous n\'avez pas de droits sur cet environnement')
    })
  })
})
