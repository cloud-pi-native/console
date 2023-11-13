import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '@/utils/keycloak.js'
import { getConnection, closeConnections } from '@/connect.js'
import quotaRouter from './quota.js'
import { adminGroupPath } from '@dso-console/shared'
import { User, getRandomEnv, getRandomQuota, getRandomQuotaStage, getRandomRole, getRandomStage, getRandomUser, repeatFn } from '@dso-console/test-utils'
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
    .register(quotaRouter)
}

let requestor: User

const setRequestor = (user: User) => {
  requestor = user
}

const getRequestor = () => {
  return requestor
}

describe('Admin quotas routes', () => {
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
  describe('getQuotaAssociatedEnvironmentsController', () => {
    it('Should retrieve a quota\'s associated environments', async () => {
      const quota = getRandomQuota('myQuota')
      // @ts-ignore
      quota.quotaStage = [getRandomQuotaStage(quota.id, 'stageId')]
      // @ts-ignore
      const environments = [getRandomEnv('dev-0', 'projectId', quota.quotaStage[0].id, 'clusterId')]
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

      prisma.quota.findUnique.mockResolvedValue(quota)
      prisma.stage.findUnique.mockResolvedValue({ id: 'stageId', name: 'dev' })
      prisma.environment.findMany.mockResolvedValue(environments)

      const response = await app.inject({ headers: { admin: 'admin' } })
      // @ts-ignore
        .get(`/${quota.id}/environments`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual([{
        // @ts-ignore
        organization: environments[0]?.project?.organization?.name,
        // @ts-ignore
        project: environments[0]?.project?.name,
        name: environments[0]?.name,
        stage: 'dev',
        owner: requestor.email,
      }])
    })
  })

  describe('createQuotaController', () => {
    it('Should create a quota', async () => {
      const quota = getRandomQuota('myQuota')
      // @ts-ignore
      quota.stageIds = ['stageId1', 'stageId2']
      // @ts-ignore
      const quotaStages = quota.stageIds.map(stageId => getRandomQuotaStage(quota.id, stageId))

      prisma.quota.findUnique.mockResolvedValueOnce(null)
      prisma.quota.create.mockResolvedValue(quota)
      prisma.quotaStage.createMany.mockResolvedValue(quotaStages)

      const response = await app.inject({ headers: { admin: 'admin' } })
      // @ts-ignore
        .post('/')
        .body(quota)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.json()).toEqual(quota)
    })

    it('Should not create a quota if name is already taken', async () => {
      const quota = getRandomQuota('myQuota')

      prisma.quota.findUnique.mockResolvedValueOnce(quota)

      const response = await app.inject({ headers: { admin: 'admin' } })
      // @ts-ignore
        .post('/')
        .body(quota)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.json().message).toEqual('Un quota portant ce nom existe déjà')
    })
  })

  describe('updateQuotaPrivacyController', () => {
    it('Should update a quota privacy', async () => {
      const quota = getRandomQuota('myQuota')

      prisma.quota.update.mockResolvedValueOnce(quota)

      const response = await app.inject({ headers: { admin: 'admin' } })
      // @ts-ignore
        .patch(`/${quota.id}/privacy`)
        .body({ isPrivate: quota.isPrivate })
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual(quota)
    })
  })

  describe('updateQuotaStageController', () => {
    it('Should update a quotaStage association', async () => {
      const quota = getRandomQuota('myQuota')
      const stages = repeatFn(4)(getRandomStage)
      const dbQuotaStage = [...stages.map(stage => getRandomQuotaStage(quota.id, stage.id)).slice(1), getRandomQuotaStage(quota.id, getRandomStage().id)]
      const newQuotaStage = stages.map(stage => getRandomQuotaStage(quota.id, stage.id))
      const data = {
        quotaId: quota.id,
        stageIds: stages.map(stage => stage.id),
      }

      prisma.quota.findUnique.mockResolvedValueOnce({ ...quota, quotaStage: dbQuotaStage })
      prisma.quotaStage.delete.mockResolvedValue(1)
      prisma.quotaStage.createMany.mockResolvedValue(1)
      prisma.quota.findUnique.mockResolvedValueOnce({ ...quota, quotaStage: newQuotaStage })

      const response = await app.inject({ headers: { admin: 'admin' } })
      // @ts-ignore
        .put('/quotastages')
        .body(data)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual(newQuotaStage)
    })

    it('Should not remove a quotaStage association if an environment suscribed it', async () => {
      const quota = getRandomQuota('myQuota')
      const stages = repeatFn(4)(getRandomStage)
      const dbQuotaStage = [...stages.map(stage => getRandomQuotaStage(quota.id, stage.id)), getRandomQuotaStage(quota.id, getRandomStage().id)]
      const data = {
        quotaId: quota.id,
        stageIds: stages.map(stage => stage.id),
      }

      prisma.quota.findUnique.mockResolvedValueOnce({ ...quota, quotaStage: dbQuotaStage })
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

  describe('deleteQuotaController', () => {
    it('Should delete a quota', async () => {
      const quota = getRandomQuota('myQuota')
      // @ts-ignore
      quota.quotaStage = [getRandomQuotaStage(quota.id, 'stageId')]

      prisma.quota.findUnique.mockResolvedValue(quota)
      prisma.stage.findUnique.mockResolvedValue({ id: 'stageId', name: 'dev' })
      prisma.environment.findMany.mockResolvedValue([])
      prisma.quota.delete.mockResolvedValueOnce(1)

      const response = await app.inject({ headers: { admin: 'admin' } })
      // @ts-ignore
        .delete(`/${quota.id}`)
        .end()

      expect(response.statusCode).toEqual(204)
    })

    it('Should not delete a quota if environments suscribed it', async () => {
      const quota = getRandomQuota('myQuota')
      // @ts-ignore
      quota.quotaStage = [getRandomQuotaStage(quota.id, 'stageId')]
      // @ts-ignore
      const environments = [getRandomEnv('dev-0', 'projectId', quota.quotaStage[0].id, 'clusterId')]
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

      prisma.quota.findUnique.mockResolvedValue(quota)
      prisma.stage.findUnique.mockResolvedValue({ id: 'stageId', name: 'dev' })
      prisma.environment.findMany.mockResolvedValue(environments)
      prisma.quota.delete.mockResolvedValueOnce(1)

      const response = await app.inject({ headers: { admin: 'admin' } })
      // @ts-ignore
        .delete(`/${quota.id}`)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.json().message).toEqual('Impossible de supprimer le quota, des environnements en activité y ont souscrit')
    })
  })
})
