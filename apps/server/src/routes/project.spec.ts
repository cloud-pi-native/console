import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { createRandomDbSetup, getRandomUser } from 'test-utils'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { faker } from '@faker-js/faker'
import { sessionConf } from '../utils/keycloak.js'
import { getConnection, closeConnections } from '../connect.js'
import projectRouter from './project.js'
import { descriptionMaxLength, projectIsLockedInfo } from 'shared'

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
    .register(projectRouter)
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
      // TODO : user.getProjects is not a function
      const randomDbSetups = [createRandomDbSetup({}), createRandomDbSetup({}), createRandomDbSetup({})]
      const randomUser = getRandomUser()
      randomDbSetups.forEach(setup => {
        setup.project.users[0].id = randomUser.id
      })
      const projects = randomDbSetups.map(project => project)

      setRequestorId(randomDbSetups[0].project.users[0].id)

      const response = await app.inject()
        .get('/')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toEqual(projects)
    })

    it('Should return an error while get list of projects', async () => {
      const response = await app.inject()
        .get('/')
        .end()

      expect(response.statusCode).toEqual(404)
      expect(response.body.json).not.toBeDefined()
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Echec de la récupération des projets de l\'utilisateur')
    })
  })

  describe('getProjectByIdController', () => {
    it('Should get a project by id', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      setRequestorId(owner.id)

      const response = await app.inject()
        .get(`/${randomDbSetup.project.id}`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toMatchObject(randomDbSetup.project)
    })

    it('Should not retreive a project when id is invalid', async () => {
      const response = await app.inject()
        .get('/invalid')
        .end()

      expect(response.statusCode).toEqual(404)
      expect(response.body.json).not.toBeDefined()
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Echec de récupération du projet de l\'utilisateur')
    })

    it('Should not retreive a project when not project member', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      setRequestorId(owner.id)

      const response = await app.inject()
        .get(`/${randomDbSetup.project.id}`)
        .end()

      expect(response.statusCode).toEqual(404)
      expect(response.body.json).not.toBeDefined()
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Echec de récupération du projet de l\'utilisateur')
    })
  })

  // POST
  describe('createProjectController', () => {
    it.skip('Should create a project', async () => {
      const randomDbSetup = createRandomDbSetup({})
      delete randomDbSetup.project.id
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      setRequestorId(owner.id)

      const response = await app.inject()
        .post('/')
        .body(randomDbSetup.project)
        .end()

      randomDbSetup.project.status = 'initializing'
      randomDbSetup.project.locked = true
      // TODO : user.addProject is not a function
      // ok en local donc pb avec bibliothèque
      expect(response.statusCode).toEqual(201)
      expect(response.json()).toBeDefined()
      expect(response.json()).toMatchObject(randomDbSetup.project)
    })

    it('Should not create a project if payload is invalid', async () => {
      const removedKey = 'organization'
      const randomDbSetup = createRandomDbSetup({})
      delete randomDbSetup.project[removedKey]

      const response = await app.inject()
        .post('/')
        .body(randomDbSetup.project)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Echec de la création du projet')
    })

    it('Should not create a project if name already exists', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')
      const newProject = randomDbSetup.project
      delete newProject.id
      delete newProject.users
      delete newProject.repositories
      delete newProject.environments

      setRequestorId(owner.id)

      const response = await app.inject()
        .post('/')
        .body(newProject)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Echec de la création du projet')
    })

    it('Should not create a project if name exists in archives', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')
      const newProject = randomDbSetup.project
      newProject.status = 'archived'
      delete newProject.id
      delete newProject.users
      delete newProject.repositories
      delete newProject.environments

      setRequestorId(owner.id)

      const response = await app.inject()
        .post('/')
        .body(newProject)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Echec de la création du projet')
    })
  })

  // PUT
  describe('updateProjectController', () => {
    it('Should update a project description', async () => {
      const randomDbSetup = createRandomDbSetup({})
      // TODO ???
      const project = Project.build(randomDbSetup.project)
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      setRequestorId(owner.id)

      const response = await app.inject()
        .put(`/${project.id}`)
        .body({ description: 'nouvelle description' })
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(response.body).toMatchObject(`${project.id}`)
    })

    it('Should not update a project description if requestor is not member', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const randomUser = getRandomUser()

      setRequestorId(randomUser.id)

      const response = await app.inject()
        .put(`/${randomDbSetup.project.id}`)
        .body({ description: 'nouvelle description' })
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.body).toEqual('Echec de la mise à jour du projet')
    })

    it('Should not update a project description if description is invalid', async () => {
      const randomDbSetup = createRandomDbSetup({})
      // TODO ???
      const project = Project.build(randomDbSetup.project)
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      setRequestorId(owner.id)

      const response = await app.inject()
        .put(`/${project.id}`)
        .body({ description: faker.string.alpha(descriptionMaxLength + 1) })
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.body).toEqual('Echec de la mise à jour du projet')
    })

    it('Should not update a project if locked', async () => {
      const randomDbSetup = createRandomDbSetup({})
      randomDbSetup.project.locked = true
      const randomUser = getRandomUser()

      setRequestorId(randomUser.id)

      const response = await app.inject()
        .put(`/${randomDbSetup.project.id}`)
        .body({ description: 'nouvelle description' })
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toEqual(projectIsLockedInfo)
    })
  })

  // DELETE
  describe('archiveProjectController', () => {
    it('Should archive a project', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      /// TODO ???
      randomDbSetup.project.environments.forEach(environment => Permissions.$queueResult(environment.permissions))
      randomDbSetup.project.repositories.forEach(repository => Repository.$queueResult(repository))
      randomDbSetup.project.environments.forEach(environment => Environment.$queueResult(environment))
      setRequestorId(owner.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(response.body).toMatchObject(`${randomDbSetup.project.id}`)
    })

    it('Should not archive a project if requestor is not member', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const randomUser = getRandomUser()

      setRequestorId(randomUser.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toEqual('Echec de la suppression du projet')
    })

    it('Should not archive a project if requestor is not owner', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const requestor = randomDbSetup.project.users[0]
      requestor.role = 'user'

      setRequestorId(requestor.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toEqual('Echec de la suppression du projet')
    })
  })
})
