import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { User, createRandomDbSetup, getRandomCluster, getRandomProject, getRandomRole, getRandomUser } from '@dso-console/test-utils'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { faker } from '@faker-js/faker'
import { sessionConf } from '../utils/keycloak.js'
import { getConnection, closeConnections } from '../connect.js'
import projectRouter from './project.js'
import { descriptionMaxLength, exclude, projectIsLockedInfo } from '@dso-console/shared'
import prisma from '../__mocks__/prisma.js'

const hookRes = {
  failed: false,
  args: {},
  gitlab: {
    secrets: {
      token: 'myToken',
    },
    status: {
      failed: false,
    },
  },
  harbor: {
    secrets: {
      token: 'myToken',
    },
    status: {
      failed: false,
    },
  },
}

vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => vi.fn()) }))
vi.mock('../prisma.js')
vi.mock('@/plugins/services.js', () => {
  return {
    servicesInfos: {
      gitlab: {
        title: 'Gitlab',
      },
      harbor: {
        title: 'Harbor',
      },
    },
  }
})
vi.mock('@/plugins/index.js', () => {
  return {
    hooks: {
      getProjectSecrets: {
        execute: () => hookRes,
      },
      updateProject: {
        execute: () => ({
          failed: false,
        }),
        validate: () => ({
          failed: false,
        }),
      },
      createProject: {
        execute: () => ({
          failed: false,
        }),
        validate: () => ({
          failed: false,
        }),
      },
      archiveProject: {
        execute: () => ({
          failed: false,
        }),
        validate: () => ({
          failed: false,
        }),
      },
    },
  }
})

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
    .register(projectRouter)
}

let requestor: User

const setRequestor = (user: User) => {
  requestor = user
}

const getRequestor = () => {
  return requestor
}

describe('Project routes', () => {
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
  describe('getUserProjectsController', () => {
    it('Should get list of a user\'s projects', async () => {
      const projects = [createRandomDbSetup({}).project, createRandomDbSetup({}).project, createRandomDbSetup({}).project]
      projects.forEach(project => {
        project.roles[0].userId = requestor.id
      })
      const publicClusters = [getRandomCluster()]

      prisma.user.upsert.mockResolvedValue(requestor)
      prisma.project.findMany.mockResolvedValue(projects)
      prisma.cluster.findMany.mockResolvedValue(publicClusters)

      const response = await app.inject()
        .get('/')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toMatchObject(projects)
    })

    it('Should return an error while get list of projects', async () => {
      const error = { statusCode: 500, message: 'Erreur de récupération de l\'utilisateur' }

      prisma.user.upsert.mockRejectedValue(error)

      const response = await app.inject()
        .get('/')
        .end()

      expect(response.statusCode).toEqual(error.statusCode)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body).message).toEqual(error.message)
    })
  })

  describe('getProjectByIdController', () => {
    it('Should get a project by id', async () => {
      const project = createRandomDbSetup({}).project
      project.roles = [...project.roles, getRandomRole(requestor.id, project.id)]

      prisma.project.findUnique.mockResolvedValue(project)

      const response = await app.inject()
        .get(`/${project.id}`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toMatchObject({ ...exclude(project, ['roles', 'clusters']), environments: [] })
    })

    it('Should not retreive a project when id is invalid', async () => {
      const response = await app.inject()
        .get('/invalid')
        .end()

      expect(response.statusCode).toEqual(404)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body).message).toEqual('Projet introuvable')
    })

    it('Should not retreive a project when not project member', async () => {
      const project = createRandomDbSetup({}).project

      prisma.project.findUnique.mockResolvedValue(project)

      const response = await app.inject()
        .get(`/${project.id}`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body).message).toEqual('Vous ne faites pas partie de ce projet')
    })
  })

  describe('getProjectSecretsController', () => {
    it('Should get a project secrets', async () => {
      const project = createRandomDbSetup({}).project
      project.roles = [...project.roles, getRandomRole(requestor.id, project.id, 'owner')]

      prisma.project.findUnique.mockResolvedValue(project)

      const response = await app.inject()
        .get(`/${project.id}/secrets`)
        .end()
      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toMatchObject({ Gitlab: { token: 'myToken' }, Harbor: { token: 'myToken' } })
    })

    it('Should not retreive a project secrets when not project owner', async () => {
      const project = createRandomDbSetup({}).project
      project.roles = [...project.roles, getRandomRole(requestor.id, project.id)]

      prisma.project.findUnique.mockResolvedValue(project)

      const response = await app.inject()
        .get(`/${project.id}/secrets`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body).message).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
    })
  })

  // POST
  describe('createProjectController', () => {
    it('Should create a project', async () => {
      const project = getRandomProject()
      const organization = project.organization

      prisma.user.upsert.mockResolvedValue(requestor)
      prisma.organization.findUnique.mockResolvedValue(organization)
      prisma.project.findMany.mockResolvedValue([])
      prisma.project.create.mockResolvedValue(project)
      prisma.project.update.mockResolvedValue(project)
      prisma.environment.findMany.mockResolvedValue([])
      prisma.repository.findMany.mockResolvedValue([])

      const response = await app.inject()
        .post('/')
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

      prisma.user.upsert.mockResolvedValue(requestor)
      prisma.organization.findUnique.mockResolvedValue(organization)

      const response = await app.inject()
        .post('/')
        .body(project)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body).message).toEqual('"name" is required')
    })

    it('Should not create a project if name already exists', async () => {
      const project = getRandomProject()
      const organization = project.organization

      prisma.user.upsert.mockResolvedValue(requestor)
      prisma.organization.findUnique.mockResolvedValue(organization)
      prisma.project.findMany.mockResolvedValue([project])

      const response = await app.inject()
        .post('/')
        .body(project)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body).message).toEqual(`"${project.name}" existe déjà`)
    })
  })

  // PUT
  describe('updateProjectController', () => {
    it('Should update a project description', async () => {
      const project = createRandomDbSetup({}).project
      project.roles = [...project.roles, getRandomRole(requestor.id, project.id)]

      prisma.project.findUnique.mockResolvedValue(project)
      prisma.project.update.mockResolvedValue(project)
      prisma.environment.findMany.mockResolvedValue([])
      prisma.repository.findMany.mockResolvedValue([])

      const response = await app.inject()
        .put(`/${project.id}`)
        .body({ description: 'nouvelle description' })
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(response.json()).toMatchObject(project)
    })

    it('Should not update a project description if requestor is not member', async () => {
      const project = createRandomDbSetup({}).project

      prisma.project.findUnique.mockResolvedValue(project)

      const response = await app.inject()
        .put(`/${project.id}`)
        .body({ description: 'nouvelle description' })
        .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).message).toEqual('Vous ne faites pas partie de ce projet')
    })

    it('Should not update a project description if description is invalid', async () => {
      const project = createRandomDbSetup({}).project
      project.roles = [...project.roles, getRandomRole(requestor.id, project.id)]

      prisma.project.findUnique.mockResolvedValue(project)

      const response = await app.inject()
        .put(`/${project.id}`)
        .body({ description: faker.string.alpha(descriptionMaxLength + 1) })
        .end()

      expect(response.statusCode).toEqual(500)
      expect(JSON.parse(response.body).message).toEqual('"description" length must be less than or equal to 280 characters long')
    })

    it('Should not update a project if locked', async () => {
      const project = createRandomDbSetup({}).project
      project.roles = [...project.roles, getRandomRole(requestor.id, project.id)]
      project.locked = true

      prisma.project.findUnique.mockResolvedValue(project)

      const response = await app.inject()
        .put(`/${project.id}`)
        .body({ description: 'nouvelle description' })
        .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).message).toEqual(projectIsLockedInfo)
    })
  })

  // DELETE
  describe('archiveProjectController', () => {
    it('Should archive a project', async () => {
      const project = createRandomDbSetup({}).project
      project.roles = [...project.roles, getRandomRole(requestor.id, project.id, 'owner')]
      project.environments = []
      project.repositories = []

      prisma.project.findUnique.mockResolvedValue(project)
      prisma.role.findFirst.mockResolvedValue({ user: {} })
      prisma.project.update.mockResolvedValue(project)

      const response = await app.inject()
        .delete(`/${project.id}`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual(`${project.id}`)
    })

    it('Should not archive a project if requestor is not member', async () => {
      const project = createRandomDbSetup({}).project

      prisma.project.findUnique.mockResolvedValue(project)
      prisma.role.findFirst.mockResolvedValue({ user: {} })

      const response = await app.inject()
        .delete(`/${project.id}`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).message).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
    })

    it('Should not archive a project if requestor is not owner', async () => {
      const project = createRandomDbSetup({}).project
      project.roles = [...project.roles, getRandomRole(requestor.id, project.id)]

      prisma.project.findUnique.mockResolvedValue(project)
      prisma.role.findFirst.mockResolvedValue({ user: {} })

      const response = await app.inject()
        .delete(`/${project.id}`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(JSON.parse(response.body).message).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
    })
  })
})
