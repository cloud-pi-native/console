import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '@/utils/keycloak.js'
import { getConnection, closeConnections } from '@/connect.js'
import stageRouter from './stage.js'
import { adminGroupPath } from '@dso-console/shared'
import { User, getRandomCluster, getRandomEnv, getRandomQuota, getRandomQuotaStage, getRandomRole, getRandomStage, getRandomUser, repeatFn } from '@dso-console/test-utils'
import { checkAdminGroup } from '@/utils/controller.js'
import prisma from '@/__mocks__/prisma.js'

// @ts-ignore
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
    .register(stageRouter)
}

let requestor: User

const setRequestor = (user: User) => {
  requestor = user
}

const getRequestor = () => {
  return requestor
}

describe('Admin stages routes', () => {
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
  describe('getStageAssociatedEnvironmentsController', () => {
    it('Should retrieve a stage\'s associated environments', async () => {
      const stage = getRandomStage('myStage')
      const quota = getRandomQuota()
      const cluster = getRandomCluster(['projectId'], [stage.id])
      // @ts-ignore
      stage.quotaStage = [getRandomQuotaStage(quota.id, stage.id)]
      // @ts-ignore
      const environments = [getRandomEnv('dev-0', 'projectId', stage.quotaStage[0].id, cluster.id)]
      environments[0].cluster = cluster
      // @ts-ignore
      environments[0].project = {
        id: 'projectId',
        name: 'project0',
        organization: {
          name: 'mi',
        },
        roles: [
          { ...getRandomRole(requestor.id, 'projectId', 'owner'), user: requestor },
        ],
      }

      prisma.stage.findUnique.mockResolvedValue(stage)
      prisma.quota.findUnique.mockResolvedValue(quota)
      prisma.environment.findMany.mockResolvedValue(environments)

      const response = await app.inject({ headers: { admin: 'admin' } })
      // @ts-ignore
        .get(`/${stage.id}/environments`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual([{
        // @ts-ignore
        organization: environments[0]?.project?.organization?.name,
        // @ts-ignore
        project: environments[0]?.project?.name,
        name: environments[0]?.name,
        quota: quota.name,
        cluster: cluster.label,
        owner: requestor.email,
      }])
    })
  })

  describe('createStageController', () => {
    it('Should create a stage', async () => {
      const stage = getRandomStage('myStage')
      // @ts-ignore
      stage.quotaIds = ['quotaId1', 'quotaId2']
      // @ts-ignore
      const quotaStages = stage.quotaIds.map(quotaId => getRandomQuotaStage(quotaId, stage.id))
      // @ts-ignore
      stage.clusters = [getRandomCluster(['projectId'], [stage.id])]
      // @ts-ignore
      stage.clusterIds = stage.clusters.map(cluster => cluster.id)

      prisma.stage.findUnique.mockResolvedValueOnce(null)
      prisma.stage.create.mockResolvedValue(stage)
      prisma.quotaStage.createMany.mockResolvedValue(quotaStages)
      prisma.stage.update.mockResolvedValue(stage)

      const response = await app.inject({ headers: { admin: 'admin' } })
      // @ts-ignore
        .post('/')
        .body(stage)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.json()).toEqual(stage)
    })

    it('Should not create a stage if name is already taken', async () => {
      const stage = getRandomStage('myStage')

      prisma.stage.findUnique.mockResolvedValueOnce(stage)

      const response = await app.inject({ headers: { admin: 'admin' } })
      // @ts-ignore
        .post('/')
        .body(stage)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.json().message).toEqual('Un stage portant ce nom existe déjà')
    })
  })

  describe('updateStageClustersController', () => {
    it('Should update a stage\'s allowed clusters', async () => {
      const stage = getRandomStage('myStage')
      const dbClusters = [getRandomCluster(['projectId'], [stage.id])]
      const newClusters = [getRandomCluster(['projectId'], [stage.id])]
      // @ts-ignore
      stage.clusters = dbClusters
      // @ts-ignore
      const clusterIds = newClusters.map(cluster => cluster.id)

      prisma.stage.findUnique.mockResolvedValueOnce(stage)
      prisma.cluster.update.mockRejectedValue(1)
      prisma.stage.update.mockResolvedValue(1)
      // @ts-ignore
      stage.clusters = newClusters
      prisma.stage.findUnique.mockResolvedValueOnce(stage)

      const response = await app.inject({ headers: { admin: 'admin' } })
      // @ts-ignore
        .patch(`/${stage.id}/clusters`)
        .body({ clusterIds })
        .end()

      expect(response.statusCode).toEqual(200)
      // @ts-ignore
      expect(response.json()).toEqual(stage.clusters)
    })
  })

  describe('updateQuotaStageController', () => {
    it('Should update a quotaStage association', async () => {
      const stage = getRandomStage('myStage')
      const quotas = repeatFn(4)(getRandomQuota)
      const dbQuotaStage = [...quotas.map(quota => getRandomQuotaStage(quota.id, stage.id)).slice(1), getRandomQuotaStage(getRandomQuota().id, stage.id)]
      const newQuotaStage = quotas.map(quota => getRandomQuotaStage(quota.id, stage.id))
      const data = {
        stageId: stage.id,
        quotaIds: quotas.map(quota => quota.id),
      }

      prisma.stage.findUnique.mockResolvedValueOnce({ ...stage, quotaStage: dbQuotaStage })
      prisma.quotaStage.delete.mockResolvedValue(1)
      prisma.quotaStage.createMany.mockResolvedValue(1)
      prisma.stage.findUnique.mockResolvedValueOnce({ ...stage, quotaStage: newQuotaStage })

      const response = await app.inject({ headers: { admin: 'admin' } })
      // @ts-ignore
        .put('/quotastages')
        .body(data)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual(newQuotaStage)
    })

    it('Should not remove a quotaStage association if an environment suscribed it', async () => {
      const stage = getRandomStage('myStage')
      const quotas = repeatFn(4)(getRandomQuota)
      const dbQuotaStage = [...quotas.map(quota => getRandomQuotaStage(quota.id, stage.id)).slice(1), getRandomQuotaStage(getRandomQuota().id, stage.id)]
      const data = {
        stageId: stage.id,
        quotaIds: quotas.map(quota => quota.id),
      }

      prisma.stage.findUnique.mockResolvedValueOnce({ ...stage, quotaStage: dbQuotaStage })
      prisma.quotaStage.delete.mockRejectedValueOnce({ message: 'Foreign key constraint failed on the field: `Environment_quotaStageId_fkey' })

      const response = await app.inject({ headers: { admin: 'admin' } })
        // @ts-ignore
        .put('/quotastages')
        .body(data)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.json().message).toEqual('L\'association quota / stage que vous souhaitez supprimer est actuellement utilisée. Vous pouvez demander aux souscripteurs concernés de changer le quota choisi pour leur environnement.')
    })
  })

  describe('deleteStageController', () => {
    it('Should delete a stage', async () => {
      const stage = getRandomStage('myStage')
      // @ts-ignore
      stage.quotaStage = [getRandomQuotaStage('quotaId', stage.id)]

      prisma.stage.findUnique.mockResolvedValue(stage)
      prisma.quota.findUnique.mockResolvedValue({ id: 'quotaId', name: 'small' })
      prisma.environment.findMany.mockResolvedValue([])
      prisma.stage.delete.mockResolvedValueOnce(1)

      const response = await app.inject({ headers: { admin: 'admin' } })
      // @ts-ignore
        .delete(`/${stage.id}`)
        .end()

      expect(response.statusCode).toEqual(204)
    })

    it('Should not delete a stage if environments suscribed it', async () => {
      const stage = getRandomStage('myStage')
      // @ts-ignore
      stage.quotaStage = [getRandomQuotaStage('quotaId', stage.id)]
      // @ts-ignore
      const environments = [getRandomEnv('dev-0', 'projectId', stage.quotaStage[0].id, 'clusterId')]
      // @ts-ignore
      environments[0].project = {
        id: 'projectId',
        name: 'project0',
        organization: {
          name: 'mi',
        },
        roles: [
          { ...getRandomRole(requestor.id, 'projectId', 'owner'), user: requestor },
        ],
      }

      prisma.stage.findUnique.mockResolvedValue(stage)
      prisma.quota.findUnique.mockResolvedValue({ id: 'quotaId', name: 'small' })
      prisma.environment.findMany.mockResolvedValue(environments)
      prisma.stage.delete.mockResolvedValueOnce(1)

      const response = await app.inject({ headers: { admin: 'admin' } })
      // @ts-ignore
        .delete(`/${stage.id}`)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.json().message).toEqual('Impossible de supprimer le stage, des environnements en activité y ont souscrit')
    })
  })
})
