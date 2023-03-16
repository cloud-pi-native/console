import { vi, describe, it, beforeAll, expect, afterEach, afterAll } from 'vitest'
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
  })

  afterAll(async () => {
    return closeConnections()
  })

  afterEach(() => {
    vi.clearAllMocks()
    sequelize.$clearQueue()
  })

  // GET
  describe('checkServiceHealthController', () => {
    it('Should retreive an OK service status', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const requestor = randomDbSetup.project.users.find(user => user.role === 'owner')
      const service = {
        id: 'vault',
        title: 'Vault',
        imgSrc: '/img/vault.svg',
        description: 'Vault s\'intègre profondément avec les identités de confiance pour automatiser l\'accès aux secrets, aux données et aux systèmes',
        to: 'https://developer.mozilla.org',
      }

      Role.$queueResult(requestor)
      setRequestorId(requestor.id)

      const response = await app.inject()
        .post(`/${randomDbSetup.project.id}/services`)
        .body(service)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('success')
    })
    it('Should retreive a NOK service status', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const requestor = randomDbSetup.project.users.find(user => user.role === 'owner')
      const service = {
        id: 'vault',
        title: 'Vault',
        imgSrc: '/img/vault.svg',
        description: 'Vault s\'intègre profondément avec les identités de confiance pour automatiser l\'accès aux secrets, aux données et aux systèmes',
        to: 'https://gitlab.com/xxxxxxxxxxxxxxx',
      }

      Role.$queueResult(requestor)
      setRequestorId(requestor.id)

      const response = await app.inject()
        .post(`/${randomDbSetup.project.id}/services`)
        .body(service)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('error')
    })
  })
})
