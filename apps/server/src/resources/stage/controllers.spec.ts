import prisma from '../../__mocks__/prisma.js'
import { vi, describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest'
import { getConnection, closeConnections } from '../../connect.js'
import { adminGroupPath } from '@cpn-console/shared'
import { getRandomCluster, getRandomQuota, getRandomRole, getRandomStage, getRandomUser, repeatFn } from '@cpn-console/test-utils'
import { faker } from '@faker-js/faker'
import { getRequestor, setRequestor } from '../../utils/mocks.js'
import app from '../../app.js'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks.js')).mockSessionPlugin)

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
        quota: {
          name: 'small',
        },
      }

      prisma.stage.findUnique.mockResolvedValue(stage)
      prisma.quota.findUnique.mockResolvedValue(quota)
      prisma.environment.findMany.mockResolvedValue([environment])

      const response = await app.inject({ headers: { admin: 'admin' } })
        // @ts-ignore
        .get(`/api/v1/stages/${stage.id}/environments`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual([{
        // @ts-ignore
        organization: environment.project.organization.name,
        // @ts-ignore
        project: environment.project.name,
        name: environment.name,
        quota: environment.quota.name,
        cluster: cluster.label,
        owner: getRequestor().email,
      }])
    })
  })

  describe('createStageController', () => {
    it('Should create a stage', async () => {
      const stage = getRandomStage('myStage')
      // @ts-ignore
      delete stage.quotas
      // @ts-ignore
      stage.quotaIds = [faker.string.uuid(), faker.string.uuid()]
      // @ts-ignore
      const clusters = [getRandomCluster({ projectIds: ['projectId'], stageIds: [stage.id] })]
      // @ts-ignore
      stage.clusterIds = clusters.map(cluster => cluster.id)

      prisma.stage.findUnique.mockResolvedValueOnce(null)
      prisma.stage.create.mockResolvedValue(stage)
      prisma.stage.update.mockResolvedValue(stage)

      const response = await app.inject({ headers: { admin: 'admin' } })
        // @ts-ignore
        .post('/api/v1/stages')
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
        .post('/api/v1/stages')
        .body(stage)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(JSON.parse(response.body).error).toEqual('Un type d\'environnement portant ce nom existe déjà')
    })
  })

  describe('update Stage Controller', () => {
    it('Should update a stage\'s allowed clusters', async () => {
      const stage = getRandomStage('myStage')
      const quotas = repeatFn(4)(getRandomQuota)
      const clusters = [getRandomCluster({ projectIds: ['projectId'], stageIds: [stage.id] })]
      const newClusters = [getRandomCluster({ projectIds: ['projectId'], stageIds: [stage.id] })]
      // @ts-ignore
      stage.clusters = clusters
      // @ts-ignore
      stage.quotas = quotas
      // @ts-ignore
      const clusterIds = newClusters.map(cluster => cluster.id)

      prisma.stage.findUnique.mockResolvedValueOnce({ ...stage, clusters })
      prisma.cluster.update.mockResolvedValue(1)
      prisma.stage.update.mockResolvedValue(1)
      // @ts-ignore
      stage.clusters = newClusters
      prisma.stage.findUniqueOrThrow.mockResolvedValueOnce(stage)

      const response = await app.inject({ headers: { admin: 'admin' } })
        // @ts-ignore
        .put(`/api/v1/stages/${stage.id}`)
        .body({ clusterIds })
        .end()
      expect(response.json()).toEqual({
        clusterIds,
        name: stage.name,
        id: stage.id,
        // @ts-ignore
        quotaIds: stage.quotas.map(({ id }) => id),
      })
      expect(response.statusCode).toEqual(200)
      // @ts-ignore
    })

    it('Should update a quotas association', async () => {
      const stage = getRandomStage('myStage')
      const quotas = repeatFn(4)(getRandomQuota)
      const clusters = []
      const data = {
        quotaIds: quotas.map(quota => quota.id),
      }
      const clusterIds = clusters.map(cluster => cluster.id)

      prisma.stage.findUnique.mockResolvedValueOnce({ ...stage, quotas, clusters })
      prisma.cluster.findMany.mockResolvedValueOnce([])
      prisma.stage.findUniqueOrThrow.mockResolvedValueOnce({ ...stage, quotas })

      const response = await app.inject({ headers: { admin: 'admin' } })
        // @ts-ignore
        .put(`/api/v1/stages/${stage.id}`)
        .body(data)
        .end()

      expect(response.json()).toEqual({
        ...data,
        id: stage.id,
        name: stage.name,
        clusterIds,
      })
      expect(response.statusCode).toEqual(200)
    })
  })

  describe('deleteStageController', () => {
    it('Should delete a stage', async () => {
      const stage = getRandomStage('myStage')

      prisma.environment.count.mockResolvedValue(0)
      prisma.stage.delete.mockResolvedValueOnce(1)

      const response = await app.inject({ headers: { admin: 'admin' } })
        // @ts-ignore
        .delete(`/api/v1/stages/${stage.id}`)
        .end()

      expect(response.statusCode).toEqual(204)
    })

    it('Should not delete a stage if environments suscribed it', async () => {
      const stage = getRandomStage('myStage')
      prisma.environment.count.mockResolvedValue(1)
      prisma.stage.delete.mockResolvedValueOnce(1)

      const response = await app.inject({ headers: { admin: 'admin' } })
        // @ts-ignore
        .delete(`/api/v1/stages/${stage.id}`)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(JSON.parse(response.body).error).toEqual('Impossible de supprimer le stage, des environnements en activité y ont souscrit')
    })
  })
})
