import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { createRandomDbSetup, getRandomRepo } from 'test-utils'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '../utils/keycloak.js'
import { getConnection, closeConnections, sequelize } from '../connect.js'
import projectRepositoryRouter from './project-repository.js'
import { getProjectModel } from '../models/project.js'
import { getUsersProjectsModel } from '../models/users-projects.js'
import { getRepositoryModel } from '../models/repository.js'

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
    .register(projectRepositoryRouter)
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
  let Role
  let Repository

  beforeAll(async () => {
    mockSession(app)
    await getConnection()
    Project = getProjectModel()
    Role = getUsersProjectsModel()
    Repository = getRepositoryModel()
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
  describe('getRepositoryByIdController', () => {
    it('Should get a repository by its id', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const repoToGet = randomDbSetup.repositories[0]

      Repository.$queueResult(repoToGet)
      Role.$queueResult(randomDbSetup.usersProjects[0])
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .get(`${randomDbSetup.project.id}/repositories/${repoToGet.id}`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toEqual(repoToGet)
    })
  })

  describe('getProjectRepositoriesController', () => {
    it('Should get repositories of a project', async () => {
      const randomDbSetup = createRandomDbSetup({})

      Repository.$queueResult(randomDbSetup.repositories)
      Role.$queueResult(randomDbSetup.usersProjects[0])
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .get(`${randomDbSetup.project.id}/repositories`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toEqual(randomDbSetup.repositories)
    })
  })

  // POST
  describe('createRepositoryController', () => {
    it('Should create a repository', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const newRepository = getRandomRepo(randomDbSetup.project.id)

      Project.$queueResult(randomDbSetup.project)
      Role.$queueResult(randomDbSetup.usersProjects[0])
      Repository.$queueResult(randomDbSetup.repositories)
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .post(`${randomDbSetup.project.id}/repositories`)
        .body(newRepository)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Repository successfully created')
    })
  })

  // PUT
  describe('updateRepositoryController', () => {
    it('Should update a repository', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const repoToUpdate = randomDbSetup.repositories[2]
      const updatedKeys = {
        externalRepoUrl: 'new',
        externalUserName: 'new',
        externalToken: 'new',
      }

      Repository.$queueResult(repoToUpdate)
      Role.$queueResult(randomDbSetup.usersProjects[0])
      Project.$queueResult([1])
      Repository.$queueResult([1])
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .put(`${randomDbSetup.project.id}/repositories/${repoToUpdate.id}`)
        .body(updatedKeys)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Repository successfully updated')
    })
  })

  // DELETE
  describe('deleteRepositoryController', () => {
    it('Should delete a repository', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const repoToDelete = randomDbSetup.repositories[1]

      Repository.$queueResult(repoToDelete)
      Role.$queueResult(randomDbSetup.usersProjects[0])
      Project.$queueResult([1])
      Repository.$queueResult([1])
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .delete(`${randomDbSetup.project.id}/repositories/${repoToDelete.id}`)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Repository successfully deleted')
    })
  })
})
