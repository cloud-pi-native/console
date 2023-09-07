import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '@/utils/keycloak.js'
import { getConnection, closeConnections } from '@/connect.js'
import projectRouter from './project.js'
import { adminGroupPath } from '@dso-console/shared'
import { User, getRandomProject, getRandomUser, repeatFn } from '@dso-console/test-utils'
import { checkAdminGroup } from '@/utils/controller.js'
import prisma from '@/__mocks__/prisma.js'

vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => vi.fn()) }))
vi.mock('@/prisma.js')

const app = fastify({ logger: false })
  .register(fastifyCookie)
  .register(fastifySession, sessionConf)

const mockSessionPlugin = (app, opt, next) => {
  app.addHook('onRequest', (req, res, next) => {
    if (req.headers.admin) {
      req.session = {
        user: {
          ...getRequestor(),
          groups: [adminGroupPath],
        },
      }
    } else {
      req.session = { user: getRequestor() }
    }
    next()
  })
  next()
}

const mockSession = (app) => {
  app.addHook('preHandler', checkAdminGroup)
    .register(fp(mockSessionPlugin))
    .register(projectRouter)
}

let requestor: User

const setRequestor = (user: User) => {
  requestor = user
}

const getRequestor = () => {
  return requestor
}

describe('Admin projects routes', () => {
  const requestor = getRandomUser()
  setRequestor(requestor)

  beforeAll(async () => {
    mockSession(app)
    await getConnection()
  })

  afterAll(async () => {
    return closeConnections()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // GET
  describe('getAllProjectsController', () => {
    it('Should retrieve all projects', async () => {
      const projects = repeatFn(2)(getRandomProject)

      prisma.project.findMany.mockResolvedValue(projects)

      const response = await app.inject({ headers: { admin: 'admin' } })
        .get('/')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toMatchObject(projects)
    })

    it('Should return an error if retrieve projects failed', async () => {
      const error = { statusCode: 500, message: 'Echec de la récupération de l\'ensemble des projets' }

      prisma.project.findMany.mockRejectedValue(error)

      const response = await app.inject({ headers: { admin: 'admin' } })
        .get('/')
        .end()

      expect(response.statusCode).toEqual(500)
      expect(JSON.parse(response.body).message).toEqual(error.message)
    })

    it('Should return an error if requestor is not admin', async () => {
      const response = await app.inject()
        .get('/')
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toEqual('Vous n\'avez pas les droits administrateur')
    })
  })
})
