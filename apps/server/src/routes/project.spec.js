import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { createRandomDbSetup, getRandomUser } from 'test-utils'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '../utils/keycloak.js'
import { getConnection, closeConnections, sequelize } from '../connect.js'
import projectRouter from './project.js'
import { getProjectModel } from '../models/project.js'
import { getUserModel } from '../models/user.js'
import { getUsersProjectsModel } from '../models/users-projects.js'

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
    .register(projectRouter)
}

const owner = {}
const setOwnerId = (id) => {
  owner.id = id
}

const getOwner = () => {
  return owner
}

describe('Project routes', () => {
  let Project
  let User
  let Role

  beforeAll(async () => {
    mockSession(app)
    await getConnection()
    Project = getProjectModel()
    User = getUserModel()
    Role = getUsersProjectsModel()
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
  describe('getUserProjectsController', () => {
    it.skip('Should get list of a user\'s projects', async () => {
      // TODO : user.getProjects is not a function
      const randomDbSetups = [createRandomDbSetup({}), createRandomDbSetup({}), createRandomDbSetup({})]
      const randomUser = getRandomUser()
      randomDbSetups.forEach(setup => {
        setup.users.unshift(randomUser)
        setup.usersProjects[0].UserId = randomUser.id
      })
      const projects = randomDbSetups.map(project => project)

      User.$queueResult(randomUser)
      Project.$queueResult(projects)
      setOwnerId(randomDbSetups[0].owner)

      const response = await app.inject()
        .get('/')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toEqual(projects)
    })

    it('Should return an error while get list of projects', async () => {
      sequelize.$queueFailure('error message')

      const response = await app.inject()
        .get('/')
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body.json).not.toBeDefined()
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Cannot retrieve projects: error message')
    })
  })

  describe('getProjectByIdController', () => {
    it('Should get a project by id', async () => {
      const randomDbSetup = createRandomDbSetup({})

      Project.$queueResult(randomDbSetup.project)
      Role.$queueResult(randomDbSetup.usersProjects[0])
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .get(`/${randomDbSetup.id}`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toMatchObject(randomDbSetup.project)
    })

    it('Should not retreive a project when id is invalid', async () => {
      sequelize.$queueFailure('custom error message')

      const response = await app.inject()
        .get('/invalid')
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body.json).not.toBeDefined()
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Cannot retrieve project: custom error message')
    })

    it('Should not retreive a project when requestor is not member of project', async () => {
      const randomDbSetup = createRandomDbSetup({})

      Project.$queueResult(randomDbSetup.project)
      Role.$queueResult(null)
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .get(`/${randomDbSetup.id}`)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body.json).not.toBeDefined()
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Cannot retrieve project: Requestor is not member of project')
    })
  })

  // POST
  describe('createProjectController', () => {
    it.skip('Should create a project', async () => {
      const randomDbSetup = createRandomDbSetup({})
      delete randomDbSetup.project.id

      // 1. checkUniqueProject
      sequelize.$queueResult(null)
      // 2. createProject
      Project.$queueResult(randomDbSetup.project)
      // 3. getUserById
      User.$queueResult(randomDbSetup.owner)
      // 4. updateProjectStatus
      sequelize.$queueResult([1])
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .post('/')
        .body(randomDbSetup.project)
        .end()

      randomDbSetup.project.status = 'initializing'
      randomDbSetup.project.locked = true
      // TODO : user.addProject is not a function
      // ok en local donc pb avec bibliothèque
      console.log(response.body)
      expect(response.statusCode).toEqual(201)
      expect(response.json()).toBeDefined()
      expect(response.json()).toMatchObject(randomDbSetup.project)
    })

    it('Should not create a project if payload is invalid', async () => {
      const removedKey = 'organization'
      const randomDbSetup = createRandomDbSetup({})
      delete randomDbSetup.project[removedKey]

      sequelize.$queueResult(null)

      const response = await app.inject()
        .post('/')
        .body(randomDbSetup.project)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual(`"${removedKey}" is required`)
    })

    it('Should not create a project if projectName already exists', async () => {
      const randomDbSetup = createRandomDbSetup({})

      Project.$queueResult(randomDbSetup.project)
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .post('/')
        .body(randomDbSetup.project)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Un projet avec le nom et dans l\'organisation demandés existe déjà')
    })

    it.skip('Should return an error if ansible api call failed', async () => {
      const ansibleError = 'Invalid ansible-api call'

      const randomDbSetup = createRandomDbSetup({})

      Project.$queueResult(null)
      Project.$queueResult(randomDbSetup.project)
      Project.$queueResult(randomDbSetup.project)
      setOwnerId(randomDbSetup.owner.id)
      const error = new Error(ansibleError)
      global.fetch = vi.fn(() => Promise.reject(error))

      const response = await app.inject()
        .post('/')
        .body(randomDbSetup.project)
        .end()

      // TODO : user.addProject is not a function
      console.log(response.body)
      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual(ansibleError)
    })
  })

  // DELETE
  describe('archiveProjectController', () => {
    it('Should archive a project', async () => {
      const randomDbSetup = createRandomDbSetup({})

      // 1. getProjectById
      Project.$queueResult(randomDbSetup.project)
      // 2. getRequestorRole
      Role.$queueResult(randomDbSetup.usersProjects[0])
      // 3. projectLoked
      sequelize.$queueResult([1])
      // 4. archiveProject
      sequelize.$queueResult([1])
      setOwnerId(randomDbSetup.owner.id)

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

      Project.$queueResult(randomDbSetup.project)
      Role.$queueResult(null)
      setOwnerId(randomUser.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}`)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toEqual('Requestor is not member of project')
    })

    it('Should not archive a project if requestor is not owner', async () => {
      const randomDbSetup = createRandomDbSetup({})
      randomDbSetup.usersProjects[0].role = 'user'
      const randomUser = getRandomUser()

      Project.$queueResult(randomDbSetup.project)
      Role.$queueResult(randomDbSetup.usersProjects[0])
      setOwnerId(randomUser.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}`)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toEqual('Requestor is not owner of project')
    })
  })
})
