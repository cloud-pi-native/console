import prisma from '../../../__mocks__/prisma.js'
import { vi, describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest'
import { getConnection, closeConnections } from '../../../connect.js'
import { adminGroupPath } from '@cpn-console/shared'
import { getRandomCluster, getRandomEnv, getRandomQuota, getRandomQuotaStage, getRandomRole, getRandomStage, getRandomUser, repeatFn } from '@cpn-console/test-utils'
import { faker } from '@faker-js/faker'
import { getRequestor, setRequestor } from '../../../utils/mocks.js'
import app from '../../../app.js'

vi.mock('fastify-keycloak-adapter', (await import('../../../utils/mocks.js')).mockSessionPlugin)

describe('Admin stage routes', () => {
  beforeAll(async () => {
    await getConnection()
  })

  afterAll(async () => {
    return closeConnections()
  })

  beforeEach(() => {
    const requestor = { ...getRandomUser(), groups: [adminGroupPath] }
    setRequestor(requestor)

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // GET
  describe('getStageAssociatedEnvironmentsController', () => {
    it('Should retrieve a stage\'s associated environments', async () => {
      const stage = getRandomStage('myStage')
      const quota = getRandomQuota()
      const cluster = getRandomCluster({ projectIds: ['projectId'], stageIds: [stage.id] })
      // @ts-ignore
      stage.quotaStage = [getRandomQuotaStage(quota.id, stage.id)]
      // @ts-ignore
      const environment = {
        name: 'env0',
        project: {
          id: 'projectId',
          name: 'project0',
          organization: {
            name: 'mi',
          },
          roles: [
            { ...getRandomRole(getRequestor().id, 'projectId', 'owner'), user: getRequestor() },
          ],
        },
        cluster,
        quotaStage: {
          quota: {
            name: 'small',
          },
        },
      }

      prisma.stage.findUnique.mockResolvedValue(stage)
      prisma.quota.findUnique.mockResolvedValue(quota)
      prisma.environment.findMany.mockResolvedValue([environment])

      const response = await app.inject({ headers: { admin: 'admin' } })
        // @ts-ignore
        .get(`/api/v1/admin/stages/${stage.id}/environments`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual([{
        // @ts-ignore
        organization: environment.project.organization.name,
        // @ts-ignore
        project: environment.project.name,
        name: environment.name,
        quota: environment.quotaStage.quota.name,
        cluster: cluster.label,
        owner: getRequestor().email,
      }])
    })
  })

  describe('createStageController', () => {
    it('Should create a stage', async () => {
      const stage = getRandomStage('myStage')
      // @ts-ignore
      stage.quotaIds = [faker.string.uuid(), faker.string.uuid()]
      // @ts-ignore
      const quotaStages = stage.quotaIds.map(quotaId => getRandomQuotaStage(quotaId, stage.id))
      // @ts-ignore
      const clusters = [getRandomCluster({ projectIds: ['projectId'], stageIds: [stage.id] })]
      // @ts-ignore
      stage.clusterIds = clusters.map(cluster => cluster.id)

      prisma.stage.findUnique.mockResolvedValueOnce(null)
      prisma.stage.create.mockResolvedValue(stage)
      prisma.quotaStage.createMany.mockResolvedValue(quotaStages)
      prisma.stage.update.mockResolvedValue(stage)

      const response = await app.inject({ headers: { admin: 'admin' } })
        // @ts-ignore
        .post('/api/v1/admin/stages')
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
        .post('/api/v1/admin/stages')
        .body(stage)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(JSON.parse(response.body).error).toEqual('Un type d\'environnement portant ce nom existe déjà')
    })
  })

  describe('updateStageClustersController', () => {
    it('Should update a stage\'s allowed clusters', async () => {
      const stage = getRandomStage('myStage')
      const dbClusters = [getRandomCluster({ projectIds: ['projectId'], stageIds: [stage.id] })]
      const newClusters = [getRandomCluster({ projectIds: ['projectId'], stageIds: [stage.id] })]
      // @ts-ignore
      stage.clusters = dbClusters
      // @ts-ignore
      const clusterIds = newClusters.map(cluster => cluster.id)

      prisma.stage.findUnique.mockResolvedValueOnce(stage)
      prisma.cluster.update.mockResolvedValue(1)
      prisma.stage.update.mockResolvedValue(1)
      // @ts-ignore
      stage.clusters = newClusters
      prisma.stage.findUniqueOrThrow.mockResolvedValueOnce(stage)

      const response = await app.inject({ headers: { admin: 'admin' } })
        // @ts-ignore
        .patch(`/api/v1/admin/stages/${stage.id}/clusters`)
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
      prisma.stage.findUniqueOrThrow.mockResolvedValueOnce({ ...stage, quotaStage: newQuotaStage })

      const response = await app.inject({ headers: { admin: 'admin' } })
        // @ts-ignore
        .put('/api/v1/admin/quotas/quotastages')
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
        .put('/api/v1/admin/quotas/quotastages')
        .body(data)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(JSON.parse(response.body).error).toEqual('L\'association quota / type d\'environnement que vous souhaitez supprimer est actuellement utilisée. Vous pouvez demander aux souscripteurs concernés de changer le quota choisi pour leur environnement.')
    })
  })

  describe('deleteStageController', () => {
    it('Should delete a stage', async () => {
      const stage = getRandomStage('myStage')
      // @ts-ignore
      stage.quotaStage = [getRandomQuotaStage('quotaId', stage.id)]

      prisma.environment.count.mockResolvedValue(0)
      prisma.stage.delete.mockResolvedValueOnce(1)

      const response = await app.inject({ headers: { admin: 'admin' } })
        // @ts-ignore
        .delete(`/api/v1/admin/stages/${stage.id}`)
        .end()

      expect(response.statusCode).toEqual(204)
    })

    it('Should not delete a stage if environments suscribed it', async () => {
      const stage = getRandomStage('myStage')
      prisma.environment.count.mockResolvedValue(1)
      prisma.stage.delete.mockResolvedValueOnce(1)

      const response = await app.inject({ headers: { admin: 'admin' } })
        // @ts-ignore
        .delete(`/api/v1/admin/stages/${stage.id}`)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(JSON.parse(response.body).error).toEqual('Impossible de supprimer le stage, des environnements en activité y ont souscrit')
    })
  })
})
