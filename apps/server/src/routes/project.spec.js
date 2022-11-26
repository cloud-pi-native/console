import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { createRandomProject, getRandomUser, getRandomRepo, repeatFn } from 'test-utils'
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

let owner
const setOwner = (givenOwner) => {
  owner = givenOwner
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
      const randomProject = createRandomProject()

      Project.$queueResult(null)
      Project.$queueResult(randomProject)
      setOwner(randomProject.owner)

      const response = await app.inject()
        .post('/')
        .body(randomProject)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.json()).toBeDefined()
      expect(response.json()).toMatchObject(randomProject)
    })

    it('Should not create a project if payload is invalid', async () => {
      const removedKey = 'orgName'
      const randomProject = createRandomProject()
      delete randomProject[removedKey]

      Project.$queueResult(null)
      Project.$queueResult(randomProject)

      const response = await app.inject()
        .post('/')
        .body(randomProject)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual(`"${removedKey}" is required`)
    })

    it('Should not create a project if projectName already exists', async () => {
      const randomProject = createRandomProject()

      Project.$queueResult(true)
      Project.$queueResult(randomProject)
      setOwner(randomProject.owner)

      const response = await app.inject()
        .post('/')
        .body(randomProject)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual(`Project '${randomProject.orgName}/${randomProject.projectName}' already exists in database`)
    })

    it('Should return an error if ansible api call failed', async () => {
      const ansibleError = 'Invalid ansible-api call'

      const randomProject = createRandomProject()

      Project.$queueResult(null)
      Project.$queueResult(randomProject)
      setOwner(randomProject.owner)
      const error = new Error(ansibleError)
      global.fetch = vi.fn(() => Promise.reject(error))

      const response = await app.inject()
        .post('/')
        .body(randomProject)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual(ansibleError)
    })
  })

  describe('addRepoController', () => {
    it('Should add a repo in project', async () => {
      const randomProject = { ...createRandomProject(), id: nanoid() }
      const randomRepo = getRandomRepo()

      sequelize.$queueResult({ data: randomProject })
      Project.$queueResult(randomProject)
      setOwner(randomProject.owner)

      const response = await app.inject()
        .post(`/${randomProject.id}/repos`)
        .body(randomRepo)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Git repository successfully added into project')
    })

    it('Should not add a repo if internalRepoName already present', async () => {
      const randomProject = { ...createRandomProject(), id: nanoid() }
      const randomRepo = randomProject.repos[0]

      sequelize.$queueResult({ data: randomProject })
      Project.$queueResult(randomProject)
      setOwner(randomProject.owner)

      const response = await app.inject()
        .post(`/${randomProject.id}/repos`)
        .body(randomRepo)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual(`Git repo '${randomRepo.internalRepoName}' already exists in project`)
    })

    it('Should not add a repo if permission is missing', async () => {
      const randomProject = createRandomProject()

      sequelize.$queueResult(null)
      setOwner(randomProject.owner)

      const response = await app.inject()
        .post(`/${randomProject.id}/repos`)
        .body(randomProject)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Missing permissions on this project')
    })
  })

  describe('addUserController', () => {
    it('Should add an user in project', async () => {
      const randomProject = { ...createRandomProject(), id: nanoid() }
      const randomUser = getRandomUser()

      sequelize.$queueResult({ data: randomProject })
      Project.$queueResult(randomProject)
      setOwner(randomProject.owner)

      const response = await app.inject()
        .post(`/${randomProject.id}/users`)
        .body(randomUser)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('User successfully added into project')
    })

    it('Should not add an user if email already present', async () => {
      const randomProject = { ...createRandomProject(), id: nanoid() }
      const randomUser = randomProject.users[0]

      sequelize.$queueResult({ data: randomProject })
      Project.$queueResult(randomProject)
      setOwner(randomProject.owner)

      const response = await app.inject()
        .post(`/${randomProject.id}/users`)
        .body(randomUser)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual(`User with email '${randomUser.email}' already member of project`)
    })

    it('Should not add an user if permission is missing', async () => {
      const randomProject = createRandomProject()
      const randomUser = getRandomUser()

      Project.$queueResult(null)
      setOwner(randomProject.owner)

      const response = await app.inject()
        .post(`/${randomProject.id}/users`)
        .body(randomUser)
        .end()

      expect(response.statusCode).toEqual(500)
    })
  })

  describe('removeUserController', () => {
    it('Should remove an user in project', async () => {
      const randomProject = { ...createRandomProject(), id: nanoid() }
      const randomUser = getRandomUser()

      sequelize.$queueResult({ data: randomProject })
      setOwner(randomProject.owner)

      const response = await app.inject()
        .delete(`/${randomProject.id}/users`)
        .body(randomUser.email)
        .end()

      expect(response.statusCode).toEqual(200)
    })

    it('Should not remove an user if permission is missing', async () => {
      const randomProject = { ...createRandomProject(), id: nanoid() }
      const randomUser = getRandomUser()

      sequelize.$queueResult(null)
      setOwner(randomProject.owner)

      const response = await app.inject()
        .delete(`/${randomProject.id}/users`)
        .body(randomUser)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toEqual('Missing permissions on this project')
    })
  })

  describe('getUserProjectsController', () => {
    it('Should get list of a user\'s projects', async () => {
      const randomProjects = repeatFn(3)(createRandomProject)

      sequelize.$queueResult(randomProjects.map(randomProject => ({ data: randomProject })))
      setOwner(randomProjects[0].owner)

      const response = await app.inject()
        .get('/')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      const data = response.json()
      data.forEach(project => {
        expect(project).toMatchObject(randomProjects.find(randomProject => randomProject.projectName === project.projectName))
      })
    })

    it('Should return an error while get list of projects', async () => {
      const errorMessage = 'error message'
      sequelize.$queueFailure(errorMessage)

      const response = await app.inject()
        .get('/')
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body.json).not.toBeDefined()
      expect(response.body).toBeDefined()
      expect(response.body).toEqual(errorMessage)
    })
  })

  describe('getUserProjectByIdController', () => {
    it('Should get a project by id', async () => {
      const randomProject = createRandomProject()

      sequelize.$queueResult({ data: randomProject })
      setOwner(randomProject.owner)

      const response = await app.inject()
        .get(`/${randomProject.id}`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toMatchObject(randomProject)
    })

    it('Should not get a project when id is invalid', async () => {
      const errorMessage = 'error message'
      sequelize.$queueFailure(errorMessage)

      const response = await app.inject()
        .get('/invalid')
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body.json).not.toBeDefined()
      expect(response.body).toBeDefined()
      expect(response.body).toEqual(errorMessage)
    })
  })
})
