import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { createRandomDbSetup, getRandomUser } from 'test-utils'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '../utils/keycloak.js'
import { getConnection, closeConnections } from '../connect.js'
import userRouter from './project-user.js'
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
    .register(userRouter)
}

const requestor = {}
const setRequestorId = (id) => {
  requestor.id = id
}

const getRequestor = () => {
  return requestor
}

describe.skip('User routes', () => {
  beforeAll(async () => {
    mockSession(app)
    await getConnection()
    global.fetch = vi.fn(() => Promise.resolve())
  })

  afterAll(async () => {
    return closeConnections()
  })

  afterEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn(() => Promise.resolve({ json: async () => { } }))
  })

  // GET
  describe('getProjectUsersController', () => {
    it('Should retreive members of a project', async () => {
      const randomDbSetup = createRandomDbSetup({ nbUsers: 3 })
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      setRequestorId(owner.id)

      const response = await app.inject()
        .get(`/${randomDbSetup.project.id}/users`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toEqual(randomDbSetup.users)
    })

    it('Should not retreive members of a project if requestor is not member himself', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      setRequestorId(owner.id)

      const response = await app.inject()
        .get(`/${randomDbSetup.project.id}/users`)
        .end()

      expect(response.statusCode).toEqual(404)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Echec de la récupération des membres du projet')
    })
  })

  // POST
  describe('addUserToProjectController', () => {
    it.skip('Should add an user in project', async () => {
      // TODO : user.addProject is not a function
      const randomDbSetup = createRandomDbSetup({})
      const randomUser = getRandomUser()
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      setRequestorId(owner.id)

      const response = await app.inject()
        .post(`/${randomDbSetup.project.id}/users`)
        .body(randomUser)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('User successfully added into project')
    })

    it('Should not add an user if email already present', async () => {
      const randomDbSetup = createRandomDbSetup({ nbUsers: 2 })
      const randomUser = randomDbSetup.users[1]
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      setRequestorId(owner.id)

      const response = await app.inject()
        .post(`/${randomDbSetup.project.id}/users`)
        .body(randomUser)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Echec de l\'ajout de l\'utilisateur au projet')
    })

    it('Should not add an user if project is missing', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const randomUser = getRandomUser()
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      setRequestorId(owner.id)

      const response = await app.inject()
        .post(`/${randomDbSetup.project.id}/users`)
        .body(randomUser)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Echec de l\'ajout de l\'utilisateur au projet')
    })

    it('Should not add an user if project is locked', async () => {
      const randomDbSetup = createRandomDbSetup({})
      randomDbSetup.project.locked = true
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      setRequestorId(owner.id)

      const response = await app.inject()
        .post(`/${randomDbSetup.project.id}/users`)
        .body({})
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual(projectIsLockedInfo)
    })
  })

  // PUT
  describe('updateUserProjectRoleController', () => {
    it('Should update a project member\'s role', async () => {
      const randomDbSetup = createRandomDbSetup({ nbUsers: 2 })
      const userToUpdate = randomDbSetup.users[1]
      userToUpdate.role = 'newRole'
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      setRequestorId(owner.id)

      const response = await app.inject()
        .put(`/${randomDbSetup.project.id}/users/${userToUpdate.id}`)
        .body(userToUpdate)
        .end()

      expect(response.statusCode).toEqual(200)
    })

    it('Should not update a project member\'s role if project locked', async () => {
      const randomDbSetup = createRandomDbSetup({})
      randomDbSetup.project.locked = true
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      setRequestorId(owner.id)

      const response = await app.inject()
        .put(`/${randomDbSetup.project.id}/users/thisIsAnId`)
        .body({})
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual(projectIsLockedInfo)
    })
  })

  // DELETE
  describe('removeUserFromProjectController', () => {
    it.skip('Should remove an user from a project', async () => {
      // TODO : user.removeProject is not a function
      const randomDbSetup = createRandomDbSetup({ nbUsers: 2 })
      const randomUser = randomDbSetup.users[1]
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      setRequestorId(owner.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}/users/${randomUser.id}`)
        .body(randomUser.email)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toEqual('User successfully removed from project')
    })

    it('Should not remove an user if project is missing', async () => {
      const randomDbSetup = createRandomDbSetup({ nbUsers: 2 })
      const randomUser = randomDbSetup.users[1]
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      setRequestorId(owner.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}/users/${randomUser.id}`)
        .body(randomUser)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toEqual('Echec de la suppression de l\'utilisateur dans le projet')
    })

    it('Should not remove an user if requestor is not member himself', async () => {
      const randomDbSetup = createRandomDbSetup({ nbUsers: 2 })
      const randomUser = randomDbSetup.users[1]
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      setRequestorId(owner.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}/users/${randomUser.id}`)
        .body(randomUser)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toEqual('Echec de la suppression de l\'utilisateur dans le projet')
    })

    it('Should not remove an user if user is not member', async () => {
      const randomDbSetup = createRandomDbSetup({ nbUsers: 2 })
      const randomUser = randomDbSetup.users[1]
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      setRequestorId(owner.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}/users/${randomUser.id}`)
        .body(randomUser)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toEqual('Echec de la suppression de l\'utilisateur dans le projet')
    })
  })
})
