import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Environment, Stage } from '@prisma/client'
import prisma from '../../__mocks__/prisma'
import { BadRequest400, NotFound404 } from '../../utils/errors'
import { createStage, deleteStage, getStageAssociatedEnvironments, listStages, updateStage } from './business'

describe('test stage busines logic', () => {
  let stage: Stage
  beforeEach(() => {
    vi.resetAllMocks()
    stage = {
      id: faker.string.uuid(),
      name: faker.company.name(),
    }
  })
  describe('createStage', () => {
    it('should create a stage', async () => {
      prisma.stage.findUnique.mockResolvedValue(null)
      prisma.stage.create.mockResolvedValue({ id: stage.id } as Stage)
      await createStage({ name: stage.name, clusterIds: [faker.string.uuid()] })
      expect(prisma.stage.update).toHaveBeenCalledTimes(1)
    })
    it('should not create a stage, name conflict', async () => {
      prisma.stage.findUnique.mockResolvedValue({ id: stage.id } as Stage)
      const response = await createStage({ name: stage.name, clusterIds: [faker.string.uuid()] })
      expect(prisma.stage.update).toHaveBeenCalledTimes(0)
      expect(response).instanceOf(BadRequest400)
    })
  })

  describe('updateStage', () => {
    it('should update a stage', async () => {
      const dbClusters = [{ id: faker.string.uuid() }]
      const newClusters = [faker.string.uuid()]
      prisma.stage.findUnique.mockResolvedValue({ ...stage, clusters: dbClusters } as Stage)
      prisma.stage.update.mockResolvedValue({ id: stage.id } as Stage)
      const response = await updateStage(stage.id, { name: stage.name, clusterIds: newClusters })
      expect(prisma.cluster.update).toHaveBeenCalledTimes(1)
      expect(prisma.cluster.update).toHaveBeenCalledWith({ where: { id: dbClusters[0].id }, data: {
        stages: {
          disconnect: {
            id: stage.id,
          },
        },
      } })
      expect(prisma.stage.update).toHaveBeenCalledTimes(1)
      expect(prisma.stage.update).toHaveBeenCalledWith({ where: { id: stage.id }, data: {
        clusters: {
          connect: [{
            id: newClusters[0],
          }],
        },
      } })
      expect(response.clusterIds).toBe(newClusters)
    })
    it('should do nothing', async () => {
      prisma.stage.findUnique.mockResolvedValue({ ...stage, clusters: [] } as Stage)
      await updateStage(stage.id, { clusterIds: [], name: stage.name })
      expect(prisma.stage.update).toHaveBeenCalledTimes(0)
    })
    it('should return not found', async () => {
      prisma.stage.findUnique.mockResolvedValue(null)
      const response = await updateStage(stage.id, { name: stage.name, clusterIds: [faker.string.uuid()] })
      expect(prisma.stage.update).toHaveBeenCalledTimes(0)
      expect(response).instanceOf(NotFound404)
    })
  })

  describe('deleteStage', () => {
    it('should delete a stage', async () => {
      prisma.environment.findFirst.mockResolvedValue(null)
      prisma.stage.delete.mockResolvedValue({ id: stage.id } as Stage)
      await deleteStage(stage.id)
      expect(prisma.stage.delete).toHaveBeenCalledTimes(1)
    })
    it('should not delete a stage, environment attached', async () => {
      prisma.environment.findFirst.mockResolvedValue({ id: faker.string.uuid() } as Environment)
      const response = await deleteStage(stage.id)
      expect(prisma.stage.delete).toHaveBeenCalledTimes(0)
      expect(response).instanceOf(BadRequest400)
    })
  })

  describe('listStages', () => {
    const clusterAssociated = [{ id: faker.string.uuid() }]
    it('should list all stages (admin, no userId provided)', async () => {
      prisma.stage.findMany.mockResolvedValue([{ clusters: clusterAssociated }] as unknown as Stage[])
      const response = await listStages()
      expect(response[0].clusterIds).toStrictEqual([clusterAssociated[0].id])
      expect(prisma.stage.findMany).toHaveBeenCalledTimes(1)
      expect(prisma.stage.findMany).toHaveBeenCalledWith({ include: { clusters: true } })
    })
  })

  describe('getStageAssociatedEnvironments', () => {
    it('should list all environments attached to a stage stages', async () => {
      const envName = faker.string.alpha(8)
      const projectSlug = faker.string.alpha(8)
      const clusterLabel = faker.string.alpha(8)
      const ownerEmail = faker.internet.email()
      const envs = [{ name: envName, project: { slug: projectSlug, owner: { email: ownerEmail } }, cluster: { label: clusterLabel } }]
      prisma.environment.findMany.mockResolvedValue(envs as unknown as Environment[])
      const response = await getStageAssociatedEnvironments(stage.id)
      expect(response).toStrictEqual([{
        name: envName,
        project: projectSlug,
        owner: ownerEmail,
        cluster: clusterLabel,
      }])
    })
  })
})
