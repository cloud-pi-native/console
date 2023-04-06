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
    req.session = { user: getRequestor() }
    next()
  })
  next()
}

const mockSession = (app) => {
  app.register(fp(mockSessionPlugin))
    .register(projectRepositoryRouter)
}

const requestor = {}
const setRequestorId = (id) => {
  requestor.id = id
}

const getRequestor = () => {
  return requestor
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
    global.fetch = vi.fn(() => Promise.resolve('kjhcsdv'))
  })

  afterAll(async () => {
    return closeConnections()
  })

  afterEach(() => {
    vi.clearAllMocks()
    sequelize.$clearQueue()
    global.fetch = vi.fn(() => Promise.resolve({ json: async () => {} }))
  })

  // GET
  describe('getRepositoryByIdController', () => {
    it('Should get a repository by its id', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const repoToGet = randomDbSetup.project.repositories[0]
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      Repository.$queueResult(repoToGet)
      Role.$queueResult(randomDbSetup.project.users[0])
      setRequestorId(owner.id)

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
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      Repository.$queueResult(randomDbSetup.project.repositories)
      Role.$queueResult(randomDbSetup.project.users[0])
      setRequestorId(owner.id)

      const response = await app.inject()
        .get(`${randomDbSetup.project.id}/repositories`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toEqual(randomDbSetup.project.repositories)
    })
  })

  // POST
  describe('createRepositoryController', () => {
    it('Should create a repository', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const newRepository = getRandomRepo(randomDbSetup.project.id)
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      Project.$queueResult(randomDbSetup.project)
      Role.$queueResult(randomDbSetup.project.users[0])
      Repository.$queueResult(randomDbSetup.project.repositories)
      setRequestorId(owner.id)

      const response = await app.inject()
        .post(`${randomDbSetup.project.id}/repositories`)
        .body(newRepository)
        .end()

      delete newRepository.id
      delete newRepository.status
      delete newRepository.externalToken
      expect(response.statusCode).toEqual(201)
      expect(response.json()).toBeDefined()
      expect(response.json()).toMatchObject(newRepository)
    })
  })

  // PUT
  describe('updateRepositoryController', () => {
    it('Should update a repository', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const repoToUpdate = randomDbSetup.project.repositories[2]
      const updatedKeys = {
        externalRepoUrl: 'new',
        externalUserName: 'new',
        externalToken: 'new',
      }
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      Repository.$queueResult(repoToUpdate)
      Role.$queueResult(randomDbSetup.project.users[0])
      Project.$queueResult([1])
      Repository.$queueResult([1])
      setRequestorId(owner.id)

      const response = await app.inject()
        .put(`${randomDbSetup.project.id}/repositories/${repoToUpdate.id}`)
        .body(updatedKeys)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Dépôt mis à jour')
    })

    it('Should should not update a repository if invalid keys', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const repoToUpdate = randomDbSetup.project.repositories[2]
      const updatedKeys = {
        isPrivate: true,
        externalRepoUrl: 'new',
        externalToken: undefined,
      }
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      Repository.$queueResult(repoToUpdate)
      Role.$queueResult(randomDbSetup.project.users[0])
      Project.$queueResult([1])
      setRequestorId(owner.id)

      const response = await app.inject()
        .put(`${randomDbSetup.project.id}/repositories/${repoToUpdate.id}`)
        .body(updatedKeys)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Dépôt non mis à jour')
    })
  })

  // DELETE
  describe('deleteRepositoryController', () => {
    it('Should delete a repository', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const repoToDelete = randomDbSetup.project.repositories[1]
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      Repository.$queueResult(repoToDelete)
      Role.$queueResult(randomDbSetup.project.users[0])
      Project.$queueResult([1])
      Repository.$queueResult([1])
      setRequestorId(owner.id)

      const response = await app.inject()
        .delete(`${randomDbSetup.project.id}/repositories/${repoToDelete.id}`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Dépôt en cours de suppression')
    })
  })
})
