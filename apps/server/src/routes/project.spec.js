import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { createRandomDbSetup, getRandomUser, repeatFn } from 'test-utils'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '../utils/keycloak.js'
import { getConnection, closeConnections, sequelize } from '../connect.js'
import projectRouter from './project.js'
import { getProjectModel } from '../models/project.js'
import { getUserModel } from '../models/user.js'

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

  beforeAll(async () => {
    mockSession(app)
    await getConnection()
    Project = getProjectModel()
    User = getUserModel()
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
  // TODO : wip
  describe('getUserProjectsController', () => {
    it.skip('Should get list of a user\'s projects', async () => {
      const randomDbSetups = repeatFn(3)(createRandomDbSetup)

      sequelize.$queueResult(randomDbSetups.map(randomDbSetup => ({ data: randomDbSetup })))
      setOwnerId(randomDbSetups[0].owner)

      const response = await app.inject()
        .get('/')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      const data = response.json()
      data.forEach(project => {
        expect(project).toMatchObject(randomDbSetups.find(randomDbSetup => randomDbSetup.projectName === project.projectName))
      })
    })

    it.skip('Should return an error while get list of projects', async () => {
      sequelize.$queueFailure('error message')

      const response = await app.inject()
        .get('/')
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body.json).not.toBeDefined()
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Cannot retrieve projects')
    })
  })

  describe('getProjectByIdController', () => {
    it.skip('Should get a project by id', async () => {
      const randomDbSetup = createRandomDbSetup({})

      sequelize.$queueResult({ data: randomDbSetup })
      setOwnerId(randomDbSetup.owner)

      const response = await app.inject()
        .get(`/${randomDbSetup.id}`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toMatchObject(randomDbSetup)
    })

    it.skip('Should not get a project when id is invalid', async () => {
      sequelize.$queueFailure('error message')

      const response = await app.inject()
        .get('/invalid')
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body.json).not.toBeDefined()
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Cannot retrieve project')
    })
  })

  // POST
  describe('createProjectController', () => {
    it.skip('Should create a project', async () => {
      const randomDbSetup = createRandomDbSetup({})
      delete randomDbSetup.project.id

      // first query : checkUniqueProject
      sequelize.$queueResult(null)
      // second query : createProject
      Project.$queueResult(randomDbSetup.project)
      // third query : getUserById
      User.$queueResult(randomDbSetup.owner)
      // fourth query : updateProjectStatus
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
      console.log({ response })
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

      Project.$queueResult([randomDbSetup.project])
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .post('/')
        .body(randomDbSetup.project)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Un projet avec le nom et dans l\'organisation demandés existe déjà')
    })

    // TODO : à réparer
    it.skip('Should return an error if ansible api call failed', async () => {
      const ansibleError = 'Invalid ansible-api call'

      const randomDbSetup = createRandomDbSetup({})

      Project.$queueResult(null)
      Project.$queueResult(randomDbSetup)
      Project.$queueResult(randomDbSetup)
      setOwnerId(randomDbSetup.owner)
      const error = new Error(ansibleError)
      global.fetch = vi.fn(() => Promise.reject(error))

      const response = await app.inject()
        .post('/')
        .body(randomDbSetup)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual(ansibleError)
    })
  })

  // DELETE
  describe('projectArchivingController', () => {
    it('Should archive a project', async () => {
      const randomDbSetup = createRandomDbSetup({})

      // first query : getProjectById
      Project.$queueResult(randomDbSetup.project)
      // second query : projectLoked
      sequelize.$queueResult([1])
      // third query : projectArchiving
      sequelize.$queueResult([1])
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(response.body).toMatchObject(`${randomDbSetup.project.id}`)
    })

    it('Should not archive a project if requestor is not owner', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const randomUser = getRandomUser()

      Project.$queueResult(randomDbSetup.project)
      setOwnerId(randomUser.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}`)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toEqual('Requestor is not owner of project')
    })
  })
})
