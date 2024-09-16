import type { Stage } from '@prisma/client'
import { faker } from '@faker-js/faker'
import { describe, expect, it } from 'vitest'
import prisma from '../../__mocks__/prisma.js'
import { BadRequest400, NotFound404 } from '../../utils/errors.ts'
import { createStage, deleteStage, getStageAssociatedEnvironments, listStages, updateStage } from './business.ts'

const stage: Stage = {
  id: faker.string.uuid(),
  name: faker.company.name(),
}
describe('test stage busines logic', () => {
  describe('createStage', () => {
    it('should create a stage', async () => {
      prisma.stage.findUnique.mockResolvedValue(undefined)
      prisma.stage.create.mockResolvedValue({ id: stage.id })
      await createStage({ name: stage.name, quotaIds: [faker.string.uuid()] })
      expect(prisma.stage.update).toHaveBeenCalledTimes(1)
    })
    it('should create a stage without quotaIds', async () => {
      prisma.stage.findUnique.mockResolvedValue(undefined)
      prisma.stage.create.mockResolvedValue({ id: stage.id })
      await createStage({ name: stage.name })
      expect(prisma.stage.update).toHaveBeenCalledTimes(0)
    })
    it('should not create a stage, name conflict', async () => {
      prisma.stage.findUnique.mockResolvedValue({ id: stage.id })
      const response = await createStage({ name: stage.name, quotaIds: [faker.string.uuid()] })
      expect(prisma.stage.update).toHaveBeenCalledTimes(0)
      expect(response).instanceOf(BadRequest400)
    })
  })

  describe('updateStage', () => {
    it('should update a stage', async () => {
      const dbQuotas = [{ id: faker.string.uuid() }]
      const dbClusters = [{ id: faker.string.uuid() }]
      const newQuotas = [faker.string.uuid()]
      prisma.stage.findUnique.mockResolvedValue({ ...stage, quotas: dbQuotas, clusters: dbClusters })
      prisma.stage.update.mockResolvedValue({ id: stage.id })
      const response = await updateStage(stage.id, { name: stage.name, quotaIds: newQuotas })
      expect(prisma.stage.update).toHaveBeenCalledTimes(3)
      expect(prisma.stage.update).toHaveBeenNthCalledWith(2, { where: expect.any(Object), data: {
        quotas: {
          disconnect: {
            id: dbQuotas[0].id,
          },
        },
      } })
      expect(prisma.stage.update).toHaveBeenNthCalledWith(3, { where: expect.any(Object), data: {
        quotas: {
          connect: {
            id: newQuotas[0],
          },
        },
      } })
      expect(response.quotaIds).toBe(newQuotas)
    })
    it('should do nothing', async () => {
      prisma.stage.findUnique.mockResolvedValue({ ...stage, quotas: [], clusters: [] })
      await updateStage(stage.id, { })
      expect(prisma.stage.update).toHaveBeenCalledTimes(0)
    })
    it('should return not found', async () => {
      prisma.stage.findUnique.mockResolvedValue(undefined)
      const response = await updateStage(stage.id, { name: stage.name, quotaIds: [faker.string.uuid()] })
      expect(prisma.stage.update).toHaveBeenCalledTimes(0)
      expect(response).instanceOf(NotFound404)
    })
  })

  describe('deleteStage', () => {
    it('should delete a stage', async () => {
      prisma.environment.findFirst.mockResolvedValue(undefined)
      prisma.stage.delete.mockResolvedValue({ id: stage.id })
      await deleteStage(stage.id)
      expect(prisma.stage.delete).toHaveBeenCalledTimes(1)
    })
    it('should not delete a stage, environment attached', async () => {
      prisma.environment.findFirst.mockResolvedValue({ id: faker.string.uuid() })
      const response = await deleteStage(stage.id)
      expect(prisma.stage.delete).toHaveBeenCalledTimes(0)
      expect(response).instanceOf(BadRequest400)
    })
  })

  describe('listStages', () => {
    const quotaAssociated = [{ id: faker.string.uuid() }]
    const clusterAssociated = [{ id: faker.string.uuid() }]
    it('should list all stages (admin, no userId provided)', async () => {
      prisma.stage.findMany.mockResolvedValue([{ quotas: quotaAssociated, clusters: clusterAssociated }])
      const response = await listStages()
      expect(response[0].quotaIds).toStrictEqual([quotaAssociated[0].id])
      expect(prisma.stage.findMany).toHaveBeenCalledTimes(1)
      expect(prisma.stage.findMany).toHaveBeenCalledWith({ include: { quotas: true, clusters: true } })
    })
  })

  describe('getStageAssociatedEnvironments', () => {
    it('should list all environments attached to a stage stages', async () => {
      const envName = faker.string.alpha(8)
      const projectName = faker.string.alpha(8)
      const orgName = faker.string.alpha(8)
      const quotaName = faker.string.alpha(8)
      const clusterLabel = faker.string.alpha(8)
      const ownerEmail = faker.internet.email()
      const envs = [{ name: envName, project: { name: projectName, organization: { name: orgName }, owner: { email: ownerEmail } }, quota: { name: quotaName }, cluster: { label: clusterLabel } }]
      prisma.environment.findMany.mockResolvedValue(envs)
      const response = await getStageAssociatedEnvironments(stage.id)
      expect(response).toStrictEqual([{
        name: envName,
        project: projectName,
        organization: orgName,
        quota: quotaName,
        owner: ownerEmail,
        cluster: clusterLabel,
      }])
    })
  })
})
