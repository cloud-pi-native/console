import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { createRandomDbSetup, getRandomUser } from 'test-utils'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '../utils/keycloak.js'
import { getConnection, closeConnections, sequelize } from '../connect.js'
import userRouter from './project-user.js'
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

describe('User routes', () => {
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
  describe('getProjectUsersController', () => {
    it('Should retreive members of a project', async () => {
      const randomDbSetup = createRandomDbSetup({ nbUsers: 3 })
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      Role.$queueResult(randomDbSetup.project.users[0])
      User.$queueResult(randomDbSetup.users)
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

      Role.$queueResult(null)
      setRequestorId(owner.id)

      const response = await app.inject()
        .get(`/${randomDbSetup.project.id}/users`)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Cannot retrieve members of project: Requestor is not member of project')
    })
  })

  // POST
  describe('addUserToProjectController', () => {
    it.skip('Should add an user in project', async () => {
      // TODO : user.addProject is not a function
      const randomDbSetup = createRandomDbSetup({})
      const randomUser = getRandomUser()
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      // 1. getProjectById
      Project.$queueResult(randomDbSetup.project)
      // 2. getRequestorRole
      Role.$queueResult(randomDbSetup.project.users[0])
      // 3. getUserByEmail
      User.$queueResult(randomUser)
      // 4. getUserToAddRole
      Role.$queueResult(null)
      // 5. lockProject
      sequelize.$queueResult([1])
      // 6. addUserToProject
      sequelize.$queueResult([1])
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

      Project.$queueResult(randomDbSetup.project)
      Role.$queueResult(randomDbSetup.project.users[0])
      User.$queueResult(randomUser)
      Role.$queueResult(randomDbSetup.project.users[1])
      setRequestorId(owner.id)

      const response = await app.inject()
        .post(`/${randomDbSetup.project.id}/users`)
        .body(randomUser)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Cannot add user into project: User is already member of projet')
    })

    it('Should not add an user if project is missing', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const randomUser = getRandomUser()
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      Project.$queueResult(null)
      setRequestorId(owner.id)

      const response = await app.inject()
        .post(`/${randomDbSetup.project.id}/users`)
        .body(randomUser)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Cannot add user into project: Project not found')
    })
  })

  // PUT
  describe('updateUserProjectRoleController', () => {
    it('Should update a project member\'s role', async () => {
      const randomDbSetup = createRandomDbSetup({ nbUsers: 2 })
      const userToUpdate = randomDbSetup.users[1]
      userToUpdate.role = 'newRole'
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      // 1. getProject
      Project.$queueResult(randomDbSetup.project)
      // 2. getRequestorRole
      Role.$queueResult(randomDbSetup.project.users[0])
      // 3. getUserToUpdateRole
      Role.$queueResult(randomDbSetup.project.users[1])
      // 4. updateUserProjectRole
      Role.$queueResult([1])

      setRequestorId(owner.id)

      const response = await app.inject()
        .put(`/${randomDbSetup.project.id}/users/${userToUpdate.id}`)
        .body(userToUpdate)
        .end()

      expect(response.statusCode).toEqual(200)
    })
  })

  // DELETE
  describe('removeUserFromProjectController', () => {
    it.skip('Should remove an user from a project', async () => {
      // TODO : user.removeProject is not a function
      const randomDbSetup = createRandomDbSetup({ nbUsers: 2 })
      const randomUser = randomDbSetup.users[1]
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      // 1. getProjectById
      Project.$queueResult(randomDbSetup.project)
      // 2. getRequestorRole
      Role.$queueResult(randomDbSetup.project.users[0])
      // 3. getUserToRemove
      User.$queueResult(randomUser)
      // 4. getUserToRemoveRole
      Role.$queueResult(randomDbSetup.project.users[1])
      // 5. project locked
      sequelize.$queueResult([1])
      // 6. removeUserFromProject
      sequelize.$queueResult([1])

      setRequestorId(owner.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}/users/${randomUser.id}`)
        .body(randomUser.email)
        .end()

      console.log(response.body)
      expect(response.statusCode).toEqual(200)
      expect(response.body).toEqual('User successfully removed from project')
    })

    it('Should not remove an user if project is missing', async () => {
      const randomDbSetup = createRandomDbSetup({ nbUsers: 2 })
      const randomUser = randomDbSetup.users[1]
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      Project.$queueResult(null)
      setRequestorId(owner.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}/users/${randomUser.id}`)
        .body(randomUser)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toEqual('Cannot remove user from project: Project not found')
    })

    it('Should not remove an user if requestor is not member himself', async () => {
      const randomDbSetup = createRandomDbSetup({ nbUsers: 2 })
      const randomUser = randomDbSetup.users[1]
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      Project.$queueResult(randomDbSetup.project)
      Role.$queueResult(null)
      setRequestorId(owner.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}/users/${randomUser.id}`)
        .body(randomUser)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toEqual('Cannot remove user from project: Requestor is not member of project')
    })

    it('Should not remove an user if user is not member', async () => {
      const randomDbSetup = createRandomDbSetup({ nbUsers: 2 })
      const randomUser = randomDbSetup.users[1]
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      Project.$queueResult(randomDbSetup.project)
      Role.$queueResult(randomDbSetup.project.users[0])
      User.$queueResult(randomUser)
      Role.$queueResult(null)
      setRequestorId(owner.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}/users/${randomUser.id}`)
        .body(randomUser)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toEqual('Cannot remove user from project: User to remove is not member of project')
    })
  })
})
