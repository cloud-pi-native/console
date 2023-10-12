import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { createRandomDbSetup, getRandomEnv, getRandomUser, getRandomRole, User, getRandomPerm, getRandomLog } from '@dso-console/test-utils'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '../utils/keycloak.js'
import { getConnection, closeConnections } from '../connect.js'
import projectEnvironmentRouter from './project-environment.js'
import { projectIsLockedInfo } from '@dso-console/shared'
import prisma from '../__mocks__/prisma.js'

vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => vi.fn()) }))
vi.mock('../prisma.js')

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
    .register(projectEnvironmentRouter)
}

let requestor: User

const setRequestor = (user: User) => {
  requestor = user
}

const getRequestor = () => {
  return requestor
}

describe('User routes', () => {
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
  describe('getEnvironmentByIdController', () => {
    it('Should retreive an environment by its id', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(requestor.id, projectInfos.id, 'owner')]
      const envToGet = projectInfos.environments[0]
      const envInfos = {
        ...envToGet,
        project: projectInfos,
        permissions: [getRandomPerm(envToGet.id, requestor)],
      }

      prisma.environment.findUnique.mockResolvedValueOnce(envInfos)

      const response = await app.inject()
        .get(`/${projectInfos.id}/environments/${envToGet.id}`)
        .end()

      expect(response.body).toStrictEqual(JSON.stringify(envInfos))
      expect(response.statusCode).toEqual(200)
    })

    it('Should not retreive an environment if not project member', async () => {
      const projectInfos = createRandomDbSetup({}).project
      const envToGet = projectInfos.environments[0]
      const envInfos = {
        ...envToGet,
        project: projectInfos,
      }

      prisma.environment.findUnique.mockResolvedValueOnce(envInfos)

      const response = await app.inject()
        .get(`/${projectInfos.id}/environments/${envInfos.id}`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body).message).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
    })

    it('Should not retreive an environment if requestor has no permission', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(requestor.id, projectInfos.id, 'owner')]
      const envToGet = projectInfos.environments[0]
      const envInfos = {
        ...envToGet,
        project: projectInfos,
      }

      prisma.environment.findUnique.mockResolvedValueOnce(envInfos)

      const response = await app.inject()
        .get(`/${projectInfos.id}/environments/${envInfos.id}`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body).message).toEqual('Vous n\'avez pas les droits suffisants pour requêter cet environnement')
    })
  })

  // POST
  describe('initializeEnvironmentController', () => {
    it('Should create an environment', async () => {
      const randomDbSetUp = createRandomDbSetup({ envs: ['prod'] })
      const projectInfos = randomDbSetUp.project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(requestor.id, projectInfos.id, 'owner')]
      const quotaStage = randomDbSetUp?.stages[0]?.quotaStage[0]
      const envToAdd = getRandomEnv('int-0', projectInfos.id, quotaStage?.id, projectInfos?.clusters[0]?.id)
      const envInfos = { ...envToAdd, project: projectInfos }
      const logCreate = getRandomLog('Create Environment', requestor.id)
      const logAdd = getRandomLog('Add Cluster to Environment', requestor.id)

      prisma.user.findUnique.mockResolvedValueOnce(requestor)
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.cluster.findMany.mockResolvedValue(projectInfos?.clusters)
      prisma.quotaStage.findUnique.mockResolvedValue(quotaStage)
      prisma.stage.findUnique.mockResolvedValue(randomDbSetUp?.stages[0])
      prisma.project.update.mockResolvedValue(projectInfos)
      prisma.environment.create.mockReturnValue(envInfos)
      prisma.log.create.mockResolvedValueOnce(logCreate)
      prisma.cluster.findUnique.mockResolvedValue(projectInfos?.clusters[0])
      prisma.log.create.mockResolvedValueOnce(logAdd)
      prisma.environment.update.mockReturnValue([envInfos])
      prisma.environment.findMany.mockReturnValue(projectInfos.environments)
      prisma.repository.findMany.mockReturnValue(projectInfos.repositories)

      const response = await app.inject()
        .post(`/${projectInfos.id}/environments`)
        .body(envToAdd)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.json()).toBeDefined()
      expect(response.json()).toMatchObject(envToAdd)
    })

    it('Should not create an environment if not project member', async () => {
      const projectInfos = createRandomDbSetup({}).project
      const envToAdd = getRandomEnv('thisIsAnId', projectInfos.id)

      prisma.user.findUnique.mockResolvedValueOnce(requestor)
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.cluster.findMany.mockResolvedValue(projectInfos?.clusters)

      const response = await app.inject()
        .post(`/${projectInfos.id}/environments`)
        .body(envToAdd)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body).message).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
    })

    it('Should not create an environment if name is already present', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(requestor.id, projectInfos.id, 'owner')]
      const envToAdd = projectInfos.environments[0]

      prisma.user.findUnique.mockResolvedValueOnce(requestor)
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.cluster.findMany.mockResolvedValue(projectInfos.clusters)

      const response = await app.inject()
        .post(`/${projectInfos.id}/environments`)
        .body(envToAdd)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body).message).toEqual('Un environnement avec le même nom et déployé sur le même cluster existe déjà pour ce projet.')
    })

    it('Should not create an environment if no cluster available', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(requestor.id, projectInfos.id, 'owner')]
      const envToAdd = getRandomEnv('thisIsAnId', projectInfos.id)

      prisma.user.findUnique.mockResolvedValueOnce(requestor)
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.cluster.findMany.mockResolvedValue(projectInfos.clusters)

      const response = await app.inject()
        .post(`/${projectInfos.id}/environments`)
        .body(envToAdd)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body).message).toEqual('Ce cluster n\'est pas disponible pour cette combinaison projet et stage')
    })

    it('Should not create an environment if quotaStage not active', async () => {
      const randomDbSetUp = createRandomDbSetup({})
      const projectInfos = randomDbSetUp.project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(requestor.id, projectInfos.id, 'owner')]
      const quotaStage = randomDbSetUp?.stages[0]?.quotaStage[0]
      quotaStage.status = 'pendingDelete'
      const envToAdd = getRandomEnv('thisIsAnId', projectInfos.id, quotaStage?.id, projectInfos?.clusters[0]?.id)

      prisma.user.findUnique.mockResolvedValueOnce(requestor)
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.cluster.findMany.mockResolvedValue(projectInfos.clusters)
      prisma.quotaStage.findUnique.mockResolvedValue(quotaStage)
      prisma.stage.findUnique.mockResolvedValue(randomDbSetUp?.stages[0])

      const response = await app.inject()
        .post(`/${projectInfos.id}/environments`)
        .body(envToAdd)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body).message).toEqual('Cette association quota / stage n\'est plus disponible.')
    })

    it('Should not create an environment if project locked', async () => {
      const projectInfos = createRandomDbSetup({}).project
      projectInfos.locked = true
      projectInfos.roles = [...projectInfos.roles, getRandomRole(requestor.id, projectInfos.id, 'owner')]

      prisma.user.findUnique.mockResolvedValueOnce(requestor)
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.cluster.findMany.mockResolvedValue(projectInfos.clusters)

      const response = await app.inject()
        .post(`/${projectInfos.id}/environments`)
        .body({})
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body).message).toEqual(projectIsLockedInfo)
    })
  })

  // DELETE
  describe('deleteEnvironmentController', () => {
    it('Should delete an environment', async () => {
      const randomDbSetUp = createRandomDbSetup({ envs: ['dev'] })
      const projectInfos = randomDbSetUp.project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(requestor.id, projectInfos.id, 'owner')]
      const logRemove = getRandomLog('Remove Cluster from Environment', requestor.id)
      const logDelete = getRandomLog('Delete Environment', requestor.id)
      const envToDelete = { ...projectInfos.environments[0], project: projectInfos }

      prisma.environment.findUnique.mockResolvedValue(envToDelete)
      prisma.project.findUnique.mockResolvedValue(projectInfos)
      prisma.environment.update.mockReturnValue(envToDelete)
      prisma.project.update.mockResolvedValue(projectInfos)
      prisma.cluster.findUnique.mockResolvedValue(projectInfos?.clusters[0])
      prisma.log.create.mockResolvedValueOnce(logRemove)
      prisma.log.create.mockResolvedValueOnce(logDelete)
      prisma.environment.delete.mockReturnValue(envToDelete)
      prisma.environment.findMany.mockReturnValue([])
      prisma.repository.findMany.mockReturnValue([])

      const response = await app.inject()
        .delete(`/${projectInfos.id}/environments/${envToDelete.id}`)
        .end()

      expect(response.statusCode).toEqual(204)
    })

    it('Should not delete an environment if not project member', async () => {
      const projectInfos = createRandomDbSetup({ envs: ['dev'] }).project
      const envToDelete = { ...projectInfos.environments[0], project: projectInfos }

      prisma.environment.findUnique.mockResolvedValue(envToDelete)
      prisma.project.findUnique.mockResolvedValue(projectInfos)

      const response = await app.inject()
        .delete(`/${projectInfos.id}/environments/${envToDelete.id}`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body).message).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
    })

    it('Should not delete an environment if not project owner', async () => {
      const projectInfos = createRandomDbSetup({ envs: ['dev'] }).project
      projectInfos.roles = [...projectInfos.roles, getRandomRole(requestor.id, projectInfos.id, 'user')]
      const envToDelete = { ...projectInfos.environments[0], project: projectInfos }

      prisma.environment.findUnique.mockResolvedValue(envToDelete)
      prisma.project.findUnique.mockResolvedValue(projectInfos)

      const response = await app.inject()
        .delete(`/${projectInfos.id}/environments/${envToDelete.id}`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toBeDefined()
      expect(JSON.parse(response.body).message).toEqual('Vous n’avez pas les permissions suffisantes dans le projet')
    })
  })
})
