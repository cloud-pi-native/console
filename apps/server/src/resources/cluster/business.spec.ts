import { describe, expect, it, vi } from 'vitest'
import { faker } from '@faker-js/faker'
import type { Cluster } from '@prisma/client'
import prisma from '../../__mocks__/prisma.js'
import { hook } from '../../__mocks__/utils/hook-wrapper.ts'
import { BadRequest400, ErrorResType, NotFound404, Unprocessable422 } from '../../utils/errors.ts'
import { createCluster, deleteCluster, getClusterAssociatedEnvironments, getClusterDetails, listClusters, updateCluster } from './business.ts'

vi.mock('../../utils/hook-wrapper.ts', async () => ({
  hook,
}))

const userId = faker.string.uuid()
const reqId = faker.string.uuid()
const cluster: Cluster = {
  id: faker.string.uuid(),
  infos: faker.lorem.lines(2),
  privacy: 'public',
}
describe('test Cluster business logic', () => {
  describe('listClusters', () => {
    it('should filter for user', async () => {
      prisma.cluster.findMany.mockResolvedValue([])
      await listClusters(userId)
      expect(prisma.cluster.findMany).toHaveBeenCalledTimes(1)
      expect(prisma.cluster.findMany).toHaveBeenCalledWith({ select: expect.any(Object), where: { OR: [{ privacy: 'public' }, expect.any(Object), expect.any(Object), expect.any(Object)] } })
    })
    it('should not filter', async () => {
      const dbStages = [{ id: faker.string.uuid() }]
      prisma.cluster.findMany.mockResolvedValue([{ stages: dbStages }])
      const response = await listClusters()
      expect(prisma.cluster.findMany).toHaveBeenCalledTimes(1)
      expect(prisma.cluster.findMany).toHaveBeenCalledWith({ select: expect.any(Object), where: {} })
      expect(response[0].stageIds).toStrictEqual([dbStages[0].id])
    })
  })

  describe('getClusterAssociatedEnvironments', () => {
    it('should list all environments attached to a cluster', async () => {
      const envName = faker.string.alpha(8)
      const projectName = faker.string.alpha(8)
      const ownerEmail = faker.internet.email()
      const envs = [{ name: envName, project: { name: projectName, owner: { email: ownerEmail } } }]
      prisma.environment.findMany.mockResolvedValue(envs)
      const response = await getClusterAssociatedEnvironments(cluster.id)
      expect(response).toStrictEqual([{
        name: envName,
        project: projectName,
        owner: ownerEmail,
      }])
    })
  })

  describe('getClusterDetails', () => {
    it('should return a cluster details', async () => {
      prisma.cluster.findUniqueOrThrow.mockResolvedValue({ ...cluster, projects: [], stages: [], kubeconfig: { user: {}, cluster: {} } })
      await getClusterDetails(cluster.id)
    })
    it('should return a cluster details, without infos in db', async () => {
      prisma.cluster.findUniqueOrThrow.mockResolvedValue({ ...cluster, infos: null, projects: [], stages: [], kubeconfig: { user: {}, cluster: {} } })
      const response = await getClusterDetails(cluster.id)
      expect(response.infos).toBe('')
    })
  })

  describe('createCluster', () => {
    it('should create cluster', async () => {
      hook.cluster.upsert.mockResolvedValue({ failed: false })
      prisma.cluster.findUnique.mockResolvedValue(undefined)
      prisma.cluster.findUniqueOrThrow.mockResolvedValue({ ...cluster, projects: [], stages: [], kubeconfig: { user: {}, cluster: {} } })
      prisma.cluster.create.mockResolvedValue(cluster)

      const response = await createCluster({
        infos: faker.string.alpha(10),
        zoneId: faker.string.uuid(),
        privacy: 'public',
        stageIds: [],
        clusterResources: false,
        kubeconfig: { cluster: { tlsServerName: faker.internet.domainName() }, user: {} },
        label: faker.string.alpha(10),
        external: false,
      }, userId, reqId)

      expect(response).not.instanceOf(ErrorResType)
      expect(prisma.cluster.create).toHaveBeenCalled()
    })
  })

  describe('updateCluster', () => {
    it('should update cluster', async () => {
      hook.cluster.upsert.mockResolvedValue({ failed: false })
      prisma.cluster.findUnique.mockResolvedValue(cluster)
      prisma.cluster.findUniqueOrThrow.mockResolvedValue({ ...cluster, projects: [], stages: [], kubeconfig: { user: {}, cluster: {} } })
      prisma.cluster.update.mockResolvedValue(cluster)

      const response = await updateCluster({
        infos: faker.string.alpha(10),
        zoneId: faker.string.uuid(),
        privacy: 'public',
        stageIds: [],
      }, cluster.id, userId, reqId)

      expect(response).not.instanceOf(ErrorResType)
      expect(prisma.cluster.update).toHaveBeenCalled()
    })
    it('should return 404', async () => {
      prisma.cluster.findUnique(undefined)
      const response = await updateCluster({ infos: faker.string.alpha(10) }, cluster.id, userId, reqId)
      expect(response).instanceOf(NotFound404)
    })
  })

  describe('deleteCluster', () => {
    it('should delete cluster', async () => {
      hook.cluster.delete.mockResolvedValue({})
      await deleteCluster(cluster.id, userId, reqId)

      expect(prisma.cluster.delete).toHaveBeenCalledTimes(1)
    })
    it('should return failed hook', async () => {
      hook.cluster.delete.mockResolvedValue({ failed: true })
      const response = await deleteCluster(cluster.id, userId, reqId)

      expect(response).instanceOf(Unprocessable422)
      expect(prisma.cluster.delete).toHaveBeenCalledTimes(0)
    })
    it('should not delete cluster, env attached', async () => {
      prisma.environment.findFirst.mockResolvedValue({ id: faker.string.uuid() })
      const response = await deleteCluster(cluster.id, userId, reqId)

      expect(prisma.cluster.delete).toHaveBeenCalledTimes(0)
      expect(response).instanceOf(BadRequest400)
    })
  })
})

// findUniqueOrThrow
