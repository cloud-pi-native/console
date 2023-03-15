import { vi, describe, it, beforeAll, afterEach, afterAll } from 'vitest'
import { createRandomDbSetup } from 'test-utils'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '../utils/keycloak.js'
import { getConnection, closeConnections, sequelize } from '../connect.js'
import userRouter from './project-service.js'
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

describe('Service route', () => {
  let Role

  beforeAll(async () => {
    mockSession(app)
    await getConnection()
    Role = getUsersProjectsModel()
    global.fetch = vi.fn(() => Promise.resolve())
  })

  afterAll(async () => {
    return closeConnections()
  })

  afterEach(() => {
    vi.clearAllMocks()
    sequelize.$clearQueue()
    global.fetch = vi.fn(() => Promise.resolve({
      json: async () => (
        {
          status: 'OK',
          code: 200,
        }
      ),
    },
    ))
  })

  // GET
  describe('checkServiceHealthController', () => {
    it('Should retreive a service status', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const requestor = randomDbSetup.project.users.find(user => user.role === 'owner')
      const service = {
        id: 'vault',
        title: 'Vault',
        imgSrc: '/img/vault.svg',
        description: 'Vault s\'intègre profondément avec les identités de confiance pour automatiser l\'accès aux secrets, aux données et aux systèmes',
        to: 'https://example.com',
      }

      Role.$queueResult(requestor)
      setRequestorId(requestor.id)

      const response = await app.inject()
        .post(`/${randomDbSetup.project.id}/services`)
        .body(service)
        .end()

      console.log(response.body)
      // expect(response.statusCode).toEqual(200)
      // expect(response.json()).toBeDefined()
      // expect(response.json()).toEqual('success')
    })
  })
})
