import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { createRandomDbSetup, getRandomUser } from 'test-utils'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '../utils/keycloak.js'
import { getConnection, closeConnections, sequelize } from '../connect.js'
import userRouter from './user.js'
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
    .register(userRouter)
}

const owner = {}
const setOwnerId = (id) => {
  owner.id = id
}

const getOwner = () => {
  return owner
}

// TODO :  Missing handler function for GET:/:projectId/users route.
describe.skip('User routes', () => {
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
      const randomDbSetup = createRandomDbSetup({})

      Role.$queueResult(randomDbSetup.usersProjects[0])
      sequelize.$queueResult(randomDbSetup.users)
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .get(`/${randomDbSetup.project.id}/users`)
        .end()

      console.log({ response })
      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toEqual(randomDbSetup.users)
    })

    it('Should not retreive members of a project if requestor is not member himself', async () => {
      const randomDbSetup = createRandomDbSetup({})

      Role.$queueResult(null)
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .get(`/${randomDbSetup.project.id}/users`)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Cannot retrieve members of project: Requestor is not member of project')
    })
  })

  // POST
  describe('projectAddUserController', () => {
    it('Should add an user in project', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const randomUser = getRandomUser()

      // 1. getProjectById
      Project.$queueResult(randomDbSetup.project)
      // 2. getRequestorRole
      Role.$queueResult(randomDbSetup.usersProjects[0])
      // 3. getUserByEmail
      User.$queueResult(randomUser)
      // 4. getUserToAddRole
      Role.$queueResult(null)
      // 5. projectLocked
      sequelize.$queueResult([1])
      // 6. projectAddUser
      sequelize.$queueResult([1])
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .post(`/${randomDbSetup.project.id}/users`)
        .body(randomUser)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('User successfully added into project')
    })

    it('Should not add an user if email already present', async () => {
      const randomDbSetup = createRandomDbSetup({ nbUsers: 1 })
      const randomUser = randomDbSetup.users[0]

      Project.$queueResult(randomDbSetup.project)
      Role.$queueResult(randomDbSetup.usersProjects[1])
      User.$queueResult(randomUser)
      Role.$queueResult(randomDbSetup.usersProjects[0])
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .put(`/${randomDbSetup.project.id}/users`)
        .body(randomUser)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Cannot add user into project: User is already member of projet')
    })

    it('Should not add an user if project is missing', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const randomUser = getRandomUser()

      Project.$queueResult(null)
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .put(`/${randomDbSetup.project.id}/users`)
        .body(randomUser)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Cannot add user into project: Project not found')
    })
  })

  // PUT
  describe('projectUpdateUserController', () => {
    it('Should update a project member\'s role', () => {
      // TODO
    })
  })

  // DELETE
  describe('projectRemoveUserController', () => {
    it('Should remove an user from a project', async () => {
      const randomDbSetup = createRandomDbSetup({ nbUsers: 1 })
      const randomUser = randomDbSetup.users[0]

      // 1. getProjectById
      Project.$queueResult(randomDbSetup.project)
      // 2. getRequestorRole
      Role.$queueResult(randomDbSetup.usersProjects[1])
      // 3. getUserToRemove
      User.$queueResult(randomUser)
      // 4. getUserToRemoveRole
      Role.$queueResult(randomDbSetup.usersProjects[0])
      // 5. project locked
      sequelize.$queueResult([1])
      // 6. projectRemoveUser
      sequelize.$queueResult([1])

      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}/users`)
        .body(randomUser.email)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toEqual('User successfully removed from project')
    })

    it('Should not remove an user if project is missing', async () => {
      const randomDbSetup = createRandomDbSetup({ nbUsers: 1 })
      const randomUser = randomDbSetup.users[0]

      Project.$queueResult(null)
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}/users`)
        .body(randomUser)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toEqual('Cannot remove user from project: Project not found')
    })

    it('Should not remove an user if requestor is not member himself', async () => {
      const randomDbSetup = createRandomDbSetup({ nbUsers: 1 })
      const randomUser = randomDbSetup.users[0]

      Project.$queueResult(randomDbSetup.project)
      Role.$queueResult(null)
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}/users`)
        .body(randomUser)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toEqual('Cannot remove user from project: Requestor is not member of project')
    })

    it('Should not remove an user if user is not member', async () => {
      const randomDbSetup = createRandomDbSetup({ nbUsers: 1 })
      const randomUser = randomDbSetup.users[0]

      Project.$queueResult(randomDbSetup.project)
      Role.$queueResult(randomDbSetup.usersProjects[1])
      User.$queueResult(randomUser)
      Role.$queueResult(null)
      setOwnerId(randomDbSetup.owner.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}/users`)
        .body(randomUser)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toEqual('Cannot remove user from project: User to remove is not member of project')
    })
  })
})
