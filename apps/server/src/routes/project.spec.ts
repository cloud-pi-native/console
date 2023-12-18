import prisma from '../__mocks__/prisma.js'
import app, { getRequestor, setRequestor } from '../__mocks__/app.js'
import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { createRandomDbSetup, getRandomCluster, getRandomNonSensitiveCluster, getRandomProject, getRandomRole, getRandomUser } from '@dso-console/test-utils'
import { faker } from '@faker-js/faker'
import { getConnection, closeConnections } from '../connect.js'
import { descriptionMaxLength, projectIsLockedInfo } from '@dso-console/shared'

describe('Project routes', () => {
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
  describe('getUserProjectsController', () => {
    it.skip('Should get list of a user\'s projects', async () => {
      const projects = [createRandomDbSetup({}).project, createRandomDbSetup({}).project, createRandomDbSetup({}).project]
      projects.forEach(project => {
        project.roles[0].userId = getRequestor().id
      })
      const publicClusters = [getRandomCluster()]

      prisma.user.upsert.mockResolvedValue(getRequestor())
      prisma.project.findMany.mockResolvedValue(projects)
      prisma.cluster.findMany.mockResolvedValue(publicClusters)

      const response = await app.inject()
        .get('/api/v1/projects')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toMatchObject(projects)
    })

    it('Should return an error while get list of projects', async () => {
      const error = { statusCode: 500, message: 'Erreur de récupération de l\'utilisateur' }

      prisma.user.upsert.mockRejectedValue(error)

      const response = await app.inject()
        .get('/api/v1/projects')
        .end()

      expect(response.statusCode).toEqual(error.statusCode)
      expect(response.body).toBeDefined()
      expect(response.json().message).toEqual(error.message)
    })
  })

  describe('getProjectByIdController', () => {
    it.skip('Should get a project by id', async () => {
      const project = createRandomDbSetup({ nbUsers: 3, envs: ['dev'] }).project
      console.log(project.environments)
      project.roles = [...project.roles, getRandomRole(getRequestor().id, project.id)]
      project.clusters = [getRandomNonSensitiveCluster()]

      prisma.project.findUnique.mockResolvedValue(project)

      const response = await app.inject()
        .get(`/api/v1/projects/${project.id}`)
        .end()

      console.log(response.json())

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toMatchObject(project)
    })

    it('Should not retrieve a project when id is invalid', async () => {
      const response = await app.inject()
        .get('/api/v1/projects/invalid')
        .end()

      expect(response.statusCode).toEqual(404)
      expect(response.body).toBeDefined()
      expect(response.json().message).toEqual('Projet introuvable')
    })

    it('Should not retrieve a project when not project member', async () => {
      const project = createRandomDbSetup({}).project

      prisma.project.findUnique.mockResolvedValue(project)

      const response = await app.inject()
        .get(`/api/v1/projects/${project.id}`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toBeDefined()
      expect(response.json().message).toEqual('Vous ne faites pas partie de ce projet')
    })
  })

  describe('getProjectSecretsController', () => {
    it.skip('Should get a project secrets', async () => {
      const project = createRandomDbSetup({}).project
      project.roles = [...project.roles, getRandomRole(getRequestor().id, project.id, 'owner')]
      project.clusters = [...project.roles, getRandomRole(getRequestor().id, project.id, 'owner')]

      prisma.project.findUnique.mockResolvedValue(project)

      const response = await app.inject()
        .get(`/api/v1/projects/${project.id}/secrets`)
        .end()
      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toMatchObject({ Gitlab: { token: 'myToken' }, Harbor: { token: 'myToken' } })
    })

    it('Should not retrieve a project secrets when not project owner', async () => {
      const project = createRandomDbSetup({}).project
      project.roles = [...project.roles, getRandomRole(getRequestor().id, project.id)]

      prisma.project.findUnique.mockResolvedValue(project)

      const response = await app.inject()
        .get(`/api/v1/projects/${project.id}/secrets`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toBeDefined()
      expect(response.json().message).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
    })
  })

  // POST
  describe('createProjectController', () => {
    it('Should create a project', async () => {
      const project = getRandomProject()
      const organization = project.organization

      prisma.user.upsert.mockResolvedValue(getRequestor())
      prisma.organization.findUnique.mockResolvedValue(organization)
      prisma.project.findMany.mockResolvedValue([])
      prisma.project.create.mockResolvedValue(project)
      prisma.project.update.mockResolvedValue(project)
      prisma.environment.findMany.mockResolvedValue([])
      prisma.repository.findMany.mockResolvedValue([])
      prisma.project.findUnique.mockResolvedValue(project)

      const response = await app.inject()
        .post('/api/v1/projects')
        .body(project)
        .end()

      delete project.organization
      expect(response.statusCode).toEqual(201)
      expect(response.json()).toBeDefined()
      expect(response.json()).toMatchObject(project)
    })

    it('Should not create a project if payload is invalid', async () => {
      const project = getRandomProject()
      const organization = project.organization
      delete project.name

      prisma.user.upsert.mockResolvedValue(getRequestor())
      prisma.organization.findUnique.mockResolvedValue(organization)

      const response = await app.inject()
        .post('/api/v1/projects')
        .body(project)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.body).toBeDefined()
      expect(response.json().message).toEqual('body must have required property \'name\'')
    })

    it('Should not create a project if name already exists', async () => {
      const project = getRandomProject()
      const organization = project.organization

      prisma.user.upsert.mockResolvedValue(getRequestor())
      prisma.organization.findUnique.mockResolvedValue(organization)
      prisma.project.findMany.mockResolvedValue([project])

      const response = await app.inject()
        .post('/api/v1/projects')
        .body(project)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.body).toBeDefined()
      expect(response.json().message).toEqual(`"${project.name}" existe déjà`)
    })
  })

  // PUT
  describe('updateProjectController', () => {
    it('Should update a project description', async () => {
      const project = createRandomDbSetup({}).project
      project.roles = [...project.roles, getRandomRole(getRequestor().id, project.id)]

      prisma.project.findUnique.mockResolvedValue(project)
      prisma.project.update.mockResolvedValue(project)
      prisma.environment.findMany.mockResolvedValue([])
      prisma.repository.findMany.mockResolvedValue([])

      const response = await app.inject()
        .put(`/api/v1/projects/${project.id}`)
        .body({ description: 'nouvelle description' })
        .end()
      delete project.clusters
      delete project.environments
      delete project.organization
      delete project.repositories
      delete project.roles

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(response.json()).toMatchObject(project)
    })

    it('Should not update a project description if requestor is not member', async () => {
      const project = createRandomDbSetup({}).project

      prisma.project.findUnique.mockResolvedValue(project)

      const response = await app.inject()
        .put(`/api/v1/projects/${project.id}`)
        .body({ description: 'nouvelle description' })
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().message).toEqual('Vous ne faites pas partie de ce projet')
    })

    it('Should not update a project description if description is invalid', async () => {
      const project = createRandomDbSetup({}).project
      project.roles = [...project.roles, getRandomRole(getRequestor().id, project.id)]

      prisma.project.findUnique.mockResolvedValue(project)

      const response = await app.inject()
        .put(`/api/v1/projects/${project.id}`)
        .body({ description: faker.string.alpha(descriptionMaxLength + 1) })
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.json().message).toEqual('"description" length must be less than or equal to 280 characters long')
    })

    it('Should not update a project if locked', async () => {
      const project = createRandomDbSetup({}).project
      project.roles = [...project.roles, getRandomRole(getRequestor().id, project.id)]
      project.locked = true

      prisma.project.findUnique.mockResolvedValue(project)

      const response = await app.inject()
        .put(`/api/v1/projects/${project.id}`)
        .body({ description: 'nouvelle description' })
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().message).toEqual(projectIsLockedInfo)
    })
  })

  // DELETE
  describe('archiveProjectController', () => {
    it('Should archive a project', async () => {
      const project = createRandomDbSetup({}).project
      project.roles = [...project.roles, getRandomRole(getRequestor().id, project.id, 'owner')]
      project.environments = []
      project.repositories = []

      prisma.project.findUnique.mockResolvedValue(project)
      prisma.role.findFirst.mockResolvedValue({ user: {} })
      prisma.project.update.mockResolvedValue(project)

      const response = await app.inject()
        .delete(`/api/v1/projects/${project.id}`)
        .end()

      expect(response.statusCode).toEqual(204)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('')
    })

    it('Should not archive a project if requestor is not member', async () => {
      const project = createRandomDbSetup({}).project

      prisma.project.findUnique.mockResolvedValue(project)
      prisma.role.findFirst.mockResolvedValue({ user: {} })

      const response = await app.inject()
        .delete(`/api/v1/projects/${project.id}`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().message).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
    })

    it('Should not archive a project if requestor is not owner', async () => {
      const project = createRandomDbSetup({}).project
      project.roles = [...project.roles, getRandomRole(getRequestor().id, project.id)]

      prisma.project.findUnique.mockResolvedValue(project)
      prisma.role.findFirst.mockResolvedValue({ user: {} })

      const response = await app.inject()
        .delete(`/api/v1/projects/${project.id}`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().message).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
    })
  })
})
