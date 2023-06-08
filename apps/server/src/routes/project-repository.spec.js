import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { createRandomDbSetup, getRandomRepo, getRandomUser } from 'test-utils'
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
import { projectIsLockedInfo } from 'shared'

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
    Project.$clearQueue()
    Role.$clearQueue()
    Repository.$clearQueue()
    global.fetch = vi.fn(() => Promise.resolve({ json: async () => {} }))
  })

  // GET
  describe('getRepositoryByIdController', () => {
    it('Should get a repository by its id', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const repoToGet = randomDbSetup.project.repositories[0]
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      Repository.$queueResult(repoToGet)
      Role.$queueResult({ UserId: owner.id, role: owner.role })
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
      Role.$queueResult({ UserId: owner.id, role: owner.role })
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
      Role.$queueResult({ UserId: owner.id, role: owner.role })
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

    it('Should not create a repository if project locked', async () => {
      const randomDbSetup = createRandomDbSetup({})
      randomDbSetup.project.locked = true
      const newRepository = getRandomRepo(randomDbSetup.project.id)
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      Project.$queueResult(randomDbSetup.project)
      setRequestorId(owner.id)

      const response = await app.inject()
        .post(`${randomDbSetup.project.id}/repositories`)
        .body(newRepository)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toEqual(projectIsLockedInfo)
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

      Project.$queueResult(randomDbSetup.project)
      Repository.$queueResult(repoToUpdate)
      Role.$queueResult({ UserId: owner.id, role: owner.role })
      Project.$queueResult([1])
      Repository.$queueResult([1])
      setRequestorId(owner.id)

      const response = await app.inject()
        .put(`${randomDbSetup.project.id}/repositories/${repoToUpdate.id}`)
        .body(updatedKeys)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Dépôt mis à jour avec succès')
    })

    it('Should not update a repository if invalid keys', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const repoToUpdate = randomDbSetup.project.repositories[2]
      const updatedKeys = {
        isPrivate: true,
        externalRepoUrl: 'new',
        externalToken: undefined,
      }
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      Project.$queueResult(randomDbSetup.project)
      Repository.$queueResult(repoToUpdate)
      Role.$queueResult({ UserId: owner.id, role: owner.role })
      sequelize.$queueResult([1])
      setRequestorId(owner.id)

      const response = await app.inject()
        .put(`${randomDbSetup.project.id}/repositories/${repoToUpdate.id}`)
        .body(updatedKeys)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Echec de la mise à jour du dépôt')
    })

    it('Should not update a repository if project locked', async () => {
      const randomDbSetup = createRandomDbSetup({})
      randomDbSetup.project.locked = true
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      Project.$queueResult(randomDbSetup.project)
      setRequestorId(owner.id)

      const response = await app.inject()
        .put(`${randomDbSetup.project.id}/repositories/thisIsAnId`)
        .body({})
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual(projectIsLockedInfo)
    })
  })

  // DELETE
  describe('deleteRepositoryController', () => {
    it('Should delete a repository', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const repoToDelete = randomDbSetup.project.repositories[1]
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      Repository.$queueResult(repoToDelete)
      Role.$queueResult({ UserId: owner.id, role: owner.role })
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

    it('Should not delete a repository if not owner', async () => {
      const randomDbSetup = createRandomDbSetup({})
      randomDbSetup.project.locked = true
      const user = getRandomUser()

      Project.$queueResult(randomDbSetup.project)
      Role.$queueResult({ UserId: user.id, role: 'user' })
      setRequestorId(user.id)

      const response = await app.inject()
        .delete(`${randomDbSetup.project.id}/repositories/thisIsAnId`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Vous n\'êtes pas souscripteur du projet')
    })
  })
})
