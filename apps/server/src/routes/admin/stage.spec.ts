import prisma from '../../__mocks__/prisma.js'
import app, { getRequestor, setRequestor } from '../../__mocks__/app.js'
import { vi, describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest'
import { getConnection, closeConnections } from '../../connect.js'
import { adminGroupPath } from '@dso-console/shared'
import { getRandomCluster, getRandomEnv, getRandomQuota, getRandomQuotaStage, getRandomRole, getRandomStage, getRandomUser, repeatFn } from '@dso-console/test-utils'

describe('Admin stages routes', () => {
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
          { ...getRandomRole(getRequestor().id, 'projectId', 'owner'), user: getRequestor() },
        ],
      }

      prisma.stage.findUnique.mockResolvedValue(stage)
      prisma.quota.findUnique.mockResolvedValue(quota)
      prisma.environment.findMany.mockResolvedValue(environments)

      const response = await app.inject({ headers: { admin: 'admin' } })
        // @ts-ignore
        .get(`/api/v1/admin/stages/${stage.id}/environments`)
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
        owner: getRequestor().email,
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
      expect(response.json().message).toEqual('Un type d\'environnement portant ce nom existe déjà')
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
      prisma.cluster.update.mockResolvedValue(1)
      prisma.stage.update.mockResolvedValue(1)
      // @ts-ignore
      stage.clusters = newClusters
      prisma.stage.findUnique.mockResolvedValueOnce(stage)

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
      prisma.stage.findUnique.mockResolvedValueOnce({ ...stage, quotaStage: newQuotaStage })

      const response = await app.inject({ headers: { admin: 'admin' } })
        // @ts-ignore
        .put('/api/v1/admin/stages/quotastages')
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
        .put('/api/v1/admin/stages/quotastages')
        .body(data)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.json().message).toEqual('L\'association quota / type d\'environnement que vous souhaitez supprimer est actuellement utilisée. Vous pouvez demander aux souscripteurs concernés de changer le quota choisi pour leur environnement.')
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
        .delete(`/api/v1/admin/stages/${stage.id}`)
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
          { ...getRandomRole(getRequestor().id, 'projectId', 'owner'), user: getRequestor() },
        ],
      }

      prisma.stage.findUnique.mockResolvedValue(stage)
      prisma.quota.findUnique.mockResolvedValue({ id: 'quotaId', name: 'small' })
      prisma.environment.findMany.mockResolvedValue(environments)
      prisma.stage.delete.mockResolvedValueOnce(1)

      const response = await app.inject({ headers: { admin: 'admin' } })
        // @ts-ignore
        .delete(`/api/v1/admin/stages/${stage.id}`)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.json().message).toEqual('Impossible de supprimer le stage, des environnements en activité y ont souscrit')
    })
  })
})
