import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { createRandomDbSetup, getRandomUser, getRandomRepo, repeatFn } from 'test-utils'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { nanoid } from 'nanoid'
import { sessionConf } from '../utils/keycloak.js'
import { getConnection, closeConnections, sequelize } from '../connect.js'
import { getProjectModel } from '../models/project.js'
import projectRouter from './project.js'

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

  beforeAll(async () => {
    mockSession(app)
    await getConnection()
    Project = getProjectModel()
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

  describe('createProjectController', () => {
    it('Should create a project', async () => {
      const randomDbSetup = createRandomDbSetup({})
      delete randomDbSetup.project.id

      // first query : checkUniqueProject
      Project.$queueResult(null)
      // second query : createProject
      Project.$queueResult(randomDbSetup.project)
      // third query : updateProjectStatus
      Project.$queueResult(randomDbSetup.project)
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .post('/')
        .body(randomDbSetup.project)
        .end()

      randomDbSetup.project.status = 'initializing'
      randomDbSetup.project.locked = true
      expect(response.statusCode).toEqual(201)
      expect(response.json()).toBeDefined()
      expect(response.json()).toMatchObject(randomDbSetup.project)
    })

    it('Should not create a project if payload is invalid', async () => {
      const removedKey = 'organization'
      const randomDbSetup = createRandomDbSetup({})
      delete randomDbSetup.project[removedKey]

      Project.$queueResult(null)
      Project.$queueResult(randomDbSetup.project)
      Project.$queueResult(randomDbSetup.project)

      const response = await app.inject()
        .post('/')
        .body(randomDbSetup.project)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual(`"${removedKey}" is required`)
    })

    it.skip('Should not create a project if projectName already exists', async () => {
      const randomDbSetup = createRandomDbSetup({})

      // TODO : envoie de true pour la requête getProject(name, org) ne semble pas fonctionner
      Project.$queueResult(true)
      Project.$queueResult(randomDbSetup.project)
      Project.$queueResult(randomDbSetup.project)
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .post('/')
        .body(randomDbSetup.project)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual(`Project '${randomDbSetup.orgName}/${randomDbSetup.projectName}' already exists in database`)
    })

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

  describe('addRepoController', () => {
    it.skip('Should add a repo in project', async () => {
      const randomDbSetup = { ...createRandomDbSetup({}), id: nanoid(), locked: false }
      const randomRepo = getRandomRepo()

      // first query : getUserProjectById
      sequelize.$queueResult({ data: randomDbSetup })
      // second query : addRepo
      Project.$queueResult([1])
      // third query : getUserProjectById
      sequelize.$queueResult({ data: randomDbSetup })
      // fourth query : updateProjectStatus
      Project.$queueResult([1])
      setOwnerId(randomDbSetup.owner)

      const response = await app.inject()
        .post(`/${randomDbSetup.id}/repos`)
        .body(randomRepo)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Git repository successfully added into project')
    })

    it.skip('Should not add a repo if internalRepoName already present', async () => {
      const randomDbSetup = { ...createRandomDbSetup({}), id: nanoid(), locked: false }
      const randomRepo = randomDbSetup.repos[0]

      sequelize.$queueResult({ data: randomDbSetup })
      Project.$queueResult([1])
      sequelize.$queueResult({ data: randomDbSetup })
      Project.$queueResult([1])
      setOwnerId(randomDbSetup.owner)

      const response = await app.inject()
        .post(`/${randomDbSetup.id}/repos`)
        .body(randomRepo)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual(`Cannot add git repository into project: Git repo '${randomRepo.internalRepoName}' already exists in project`)
    })

    it.skip('Should not add a repo if permission is missing', async () => {
      const randomDbSetup = createRandomDbSetup({})

      sequelize.$queueResult(null)
      setOwnerId(randomDbSetup.owner)

      const response = await app.inject()
        .post(`/${randomDbSetup.id}/repos`)
        .body(randomDbSetup)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Missing permissions on this project')
    })
  })

  describe('addUserController', () => {
    it.skip('Should add an user in project', async () => {
      const randomDbSetup = { ...createRandomDbSetup({}), id: nanoid(), locked: false }
      const randomUser = getRandomUser()

      // first query : getUserProjectById
      sequelize.$queueResult({ data: randomDbSetup })
      // second query : addUser
      Project.$queueResult([1])
      // third query : getUserProjectById
      sequelize.$queueResult({ data: randomDbSetup })
      // fourth query : updateProjectStatus
      Project.$queueResult([1])
      setOwnerId(randomDbSetup.owner)

      const response = await app.inject()
        .post(`/${randomDbSetup.id}/users`)
        .body(randomUser)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('User successfully added into project')
    })

    it.skip('Should not add an user if email already present', async () => {
      const randomDbSetup = { ...createRandomDbSetup({}), id: nanoid(), locked: false }
      const randomUser = randomDbSetup.users[0]

      sequelize.$queueResult({ data: randomDbSetup })
      Project.$queueResult([1])
      sequelize.$queueResult({ data: randomDbSetup })
      Project.$queueResult([1])
      setOwnerId(randomDbSetup.owner)

      const response = await app.inject()
        .post(`/${randomDbSetup.id}/users`)
        .body(randomUser)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual(`Cannot add user into project: User with email '${randomUser.email}' already member of project`)
    })

    it.skip('Should not add an user if permission is missing', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const randomUser = getRandomUser()

      Project.$queueResult(null)
      setOwnerId(randomDbSetup.owner)

      const response = await app.inject()
        .post(`/${randomDbSetup.id}/users`)
        .body(randomUser)
        .end()

      expect(response.statusCode).toEqual(500)
    })
  })

  describe('removeUserController', () => {
    it.skip('Should remove an user in project', async () => {
      const randomDbSetup = { ...createRandomDbSetup({}), id: nanoid(), locked: false }
      const randomUser = getRandomUser()

      sequelize.$queueResult({ data: randomDbSetup })
      Project.$queueResult(randomDbSetup)
      setOwnerId(randomDbSetup.owner)

      const response = await app.inject()
        .delete(`/${randomDbSetup.id}/users`)
        .body(randomUser.email)
        .end()

      expect(response.statusCode).toEqual(200)
    })

    it.skip('Should not remove an user if permission is missing', async () => {
      const randomDbSetup = { ...createRandomDbSetup({}), id: nanoid(), locked: false }
      const randomUser = getRandomUser()

      sequelize.$queueResult(null)
      setOwnerId(randomDbSetup.owner)

      const response = await app.inject()
        .delete(`/${randomDbSetup.id}/users`)
        .body(randomUser)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toEqual('Cannot remove user from project: Missing permissions on this project')
    })
  })

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

  describe('getUserProjectByIdController', () => {
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
})
