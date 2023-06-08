import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '../../utils/keycloak.js'
import { getConnection, closeConnections, sequelize } from '../../connect.js'
import projectRouter from './project.js'
import { getProjectModel } from '../../models/project.js'
import { getUserModel } from '../../models/user.js'
import { adminGroupPath } from 'shared'
import { getRandomProject, getRandomUser, repeatFn } from 'test-utils'
import { checkAdminGroup } from '../../utils/controller.js'

vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => vi.fn()) }))

const app = fastify({ logger: false })
  .register(fastifyCookie)
  .register(fastifySession, sessionConf)

const mockSessionPlugin = (app, opt, next) => {
  app.addHook('onRequest', (req, res, next) => {
    if (req.headers.admin) {
      req.session = { user: { groups: [adminGroupPath] } }
    } else {
      req.session = { user: { } }
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

describe('Admin projects routes', () => {
  let Project
  let User

  beforeAll(async () => {
    mockSession(app)
    await getConnection()
    Project = getProjectModel()
    User = getUserModel()
  })

  afterAll(async () => {
    return closeConnections()
  })

  afterEach(() => {
    vi.clearAllMocks()
    sequelize.$clearQueue()
    Project.$clearQueue()
  })

  // GET
  describe('getAllProjectsController', () => {
    it('Should retrieve all projects', async () => {
      const projects = repeatFn(2)(getRandomProject).map(project => Project.build(project))
      const owner = getRandomUser()

      Project.$queueResult(projects)
      projects.forEach(_project => User.$queueResult(owner))

      const projectsWithOwner = projects.map(project => ({
        ...project.get({ plain: true }),
        owner,
      }),
      )

      const response = await app.inject({ headers: { admin: 'admin' } })
        .get('/')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(JSON.stringify(response.json())).toMatchObject(JSON.stringify(projectsWithOwner))
    })

    it('Should return an error if retrieve projects failed', async () => {
      Project.$queueFailure()

      const response = await app.inject({ headers: { admin: 'admin' } })
        .get('/')
        .end()

      expect(response.statusCode).toEqual(404)
      expect(response.body).toEqual('Echec de la récupération de l\'ensemble des projets')
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
