import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import prisma from '../../__mocks__/prisma.js'
import { getRequestor, setRequestor } from '../../utils/mocks.js'
import app from '../../app.js'
import { createRandomDbSetup, getRandomProject, getRandomRole, getRandomUser } from '@cpn-console/test-utils'
import { faker } from '@faker-js/faker'
import { descriptionMaxLength, projectIsLockedInfo } from '@cpn-console/shared'
import { getConnection, closeConnections } from '../../connect.js'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks.js')).mockSessionPlugin)
vi.mock('@cpn-console/hooks', (await import('../../utils/mocks.js')).mockHooksPackage)
vi.mock('../../utils/hook-wrapper.js', (await import('../../utils/mocks.js')).mockHookWrapper)

describe('Project routes', () => {
  const requestor = getRandomUser()
  requestor.groups = []
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
    it('Should return an error while get list of projects', async () => {
      const error = { statusCode: 500, message: 'Erreur de récupération de l\'utilisateur' }

      prisma.user.upsert.mockRejectedValue(error)

      const response = await app.inject()
        .get('/api/v1/projects')
        .end()

      expect(response.statusCode).toEqual(error.statusCode)
      expect(JSON.parse(response.body).error).toEqual(error.message)
    })
  })

  describe('getProjectSecretsController', () => {
    it('Should get a project secrets', async () => {
      const project = createRandomDbSetup({}).project
      project.roles = [...project.roles, getRandomRole(getRequestor().id, project.id, 'owner')]

      prisma.project.findUnique.mockResolvedValue(project)

      const response = await app.inject()
        .get(`/api/v1/projects/${project.id}/secrets`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toMatchObject({ Harbor: { token: 'myToken' } })
    })

    it('Should not retrieve a project secrets when not project owner', async () => {
      const project = createRandomDbSetup({}).project
      project.roles = [...project.roles, getRandomRole(getRequestor().id, project.id)]

      prisma.project.findUnique.mockResolvedValue(project)

      const response = await app.inject()
        .get(`/api/v1/projects/${project.id}/secrets`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).error).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
    })
  })

  // POST
  describe('createProjectController', () => {
    it('Should create a project', async () => {
      const project = getRandomProject()
      const organization = project.organization
      project.clusters = []

      prisma.user.upsert.mockResolvedValue(getRequestor())
      prisma.organization.findUnique.mockResolvedValue(organization)
      prisma.project.findMany.mockResolvedValue([])
      prisma.project.create.mockResolvedValue(project)
      prisma.project.update.mockResolvedValue(project)
      prisma.environment.findMany.mockResolvedValue([])
      prisma.repository.findMany.mockResolvedValue([])
      prisma.cluster.findMany.mockResolvedValue([])
      prisma.project.findUniqueOrThrow.mockResolvedValue(project)

      const response = await app.inject()
        .post('/api/v1/projects')
        .body(project)
        .end()

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
      expect(JSON.parse(response.body).bodyErrors.issues[0].message).toEqual('Required')
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
      expect(JSON.parse(response.body).error).toEqual(`Le projet "${project.name}" existe déjà`)
    })
  })

  // PUT
  describe('updateProjectController', () => {
    it('Should update a project description', async () => {
      const project = createRandomDbSetup({}).project
      project.roles = [...project.roles, getRandomRole(getRequestor().id, project.id)]

      prisma.project.findUnique.mockResolvedValueOnce(project)
      prisma.project.update.mockResolvedValue(project)
      prisma.environment.findMany.mockResolvedValue([])
      prisma.repository.findMany.mockResolvedValue([])
      prisma.project.findUniqueOrThrow.mockResolvedValueOnce(project)

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
      expect(JSON.parse(response.body).error).toEqual('Vous ne faites pas partie de ce projet')
    })

    it('Should not update a project description if description is invalid', async () => {
      const project = createRandomDbSetup({}).project
      project.roles = [...project.roles, getRandomRole(getRequestor().id, project.id)]

      prisma.project.findUnique.mockResolvedValue(project)

      const response = await app.inject()
        .put(`/api/v1/projects/${project.id}`)
        .body({ description: faker.string.alpha(descriptionMaxLength + 1) })
        .end()

      expect(response.statusCode).toEqual(400)
      expect(JSON.parse(response.body).bodyErrors.issues[0].message).toEqual('String must contain at most 280 character(s)')
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
      expect(JSON.parse(response.body).error).toEqual(projectIsLockedInfo)
    })
  })

  describe('replayHooksController', () => {
    it('Should replay hooks for a project', async () => {
      const project = createRandomDbSetup({}).project
      project.roles = [...project.roles, getRandomRole(getRequestor().id, project.id, 'user')]

      prisma.project.findUnique.mockResolvedValue(project)

      const response = await app.inject()
        .put(`/api/v1/projects/${project.id}/hooks`)
        .end()

      expect(response.statusCode).toEqual(204)
    })

    it('Should not replay hooks for a project if requestor is not member nor admin', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const project = randomDbSetup.project

      prisma.project.findUnique.mockResolvedValue(project)

      const response = await app.inject()
        .put(`/api/v1/projects/${project.id}/hooks`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).error).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
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
      expect(JSON.parse(response.body).error).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
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
      expect(JSON.parse(response.body).error).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
    })
  })
})
