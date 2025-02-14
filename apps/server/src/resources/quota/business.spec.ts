import { faker } from '@faker-js/faker'
import { describe, expect, it } from 'vitest'
import type { Quota } from '@prisma/client'
import prisma from '../../__mocks__/prisma.js'
import { BadRequest400, NotFound404 } from '../../utils/errors.ts'
import { createQuota, deleteQuota, getQuotaAssociatedEnvironments, listQuotas, updateQuota } from './business.ts'

const quota: Quota = {
  cpu: 1,
  memory: '1Gi',
  id: faker.string.uuid(),
  isPrivate: false,
  name: faker.company.name(),
}
describe('test quota busines logic', () => {
  describe('createQuota', () => {
    it('should create a quota', async () => {
      prisma.quota.findUnique.mockResolvedValue(undefined)
      prisma.quota.create.mockResolvedValue({ id: quota.id })
      await createQuota({ cpu: quota.cpu, isPrivate: quota.isPrivate, memory: quota.memory, name: quota.name, stageIds: [faker.string.uuid()] })
      expect(prisma.quota.update).toHaveBeenCalledTimes(1)
    })
    it('should create a quota without stageIds', async () => {
      prisma.quota.findUnique.mockResolvedValue(undefined)
      prisma.quota.create.mockResolvedValue({ id: quota.id })
      await createQuota({ cpu: quota.cpu, isPrivate: quota.isPrivate, memory: quota.memory, name: quota.name })
      expect(prisma.quota.update).toHaveBeenCalledTimes(0)
    })
    it('should not create a quota, name conflict', async () => {
      prisma.quota.findUnique.mockResolvedValue({ id: quota.id })
      const response = await createQuota({ cpu: quota.cpu, isPrivate: quota.isPrivate, memory: quota.memory, name: quota.name, stageIds: [faker.string.uuid()] })
      expect(prisma.quota.update).toHaveBeenCalledTimes(0)
      expect(response).instanceOf(BadRequest400)
    })
  })

  describe('updateQuota', () => {
    it('should update a quota', async () => {
      const dbStages = [{ id: faker.string.uuid() }]
      const newStages = [faker.string.uuid()]
      prisma.quota.findUnique.mockResolvedValue({ ...quota, stages: dbStages })
      prisma.quota.update.mockResolvedValue({ id: quota.id })
      const response = await updateQuota(quota.id, { cpu: quota.cpu, isPrivate: quota.isPrivate, memory: quota.memory, name: quota.name, stageIds: newStages })
      expect(prisma.quota.update).toHaveBeenCalledTimes(3)
      expect(prisma.quota.update).toHaveBeenNthCalledWith(2, { where: expect.any(Object), data: {
        stages: {
          disconnect: {
            id: dbStages[0].id,
          },
        },
      } })
      expect(prisma.quota.update).toHaveBeenNthCalledWith(3, { where: expect.any(Object), data: {
        stages: {
          connect: {
            id: newStages[0],
          },
        },
      } })
      expect(response.stageIds).toBe(newStages)
    })
    it('should do nothing', async () => {
      prisma.quota.findUnique.mockResolvedValue({ ...quota, stages: [] })
      await updateQuota(quota.id, { })
      expect(prisma.quota.update).toHaveBeenCalledTimes(0)
    })
    it('should return not found', async () => {
      prisma.quota.findUnique.mockResolvedValue(undefined)
      const response = await updateQuota(quota.id, { cpu: quota.cpu, isPrivate: quota.isPrivate, memory: quota.memory, name: quota.name, stageIds: [faker.string.uuid()] })
      expect(prisma.quota.update).toHaveBeenCalledTimes(0)
      expect(response).instanceOf(NotFound404)
    })
  })

  describe('deleteQuota', () => {
    it('should delete a quota', async () => {
      prisma.environment.findFirst.mockResolvedValue(undefined)
      prisma.quota.delete.mockResolvedValue({ id: quota.id })
      await deleteQuota(quota.id)
      expect(prisma.quota.delete).toHaveBeenCalledTimes(1)
    })
    it('should not delete a quota, environment attached', async () => {
      prisma.environment.findFirst.mockResolvedValue({ id: faker.string.uuid() })
      const response = await deleteQuota(quota.id)
      expect(prisma.quota.delete).toHaveBeenCalledTimes(0)
      expect(response).instanceOf(BadRequest400)
    })
  })

  describe('listQuota', () => {
    const stageAssociated = [{ id: faker.string.uuid() }]
    it('should list all quotas (admin, no userId provided)', async () => {
      prisma.quota.findMany.mockResolvedValue([{ stages: stageAssociated }])
      const response = await listQuotas()
      expect(response[0].stageIds).toStrictEqual([stageAssociated[0].id])
      expect(prisma.quota.findMany).toHaveBeenCalledTimes(1)
      expect(prisma.quota.findMany).toHaveBeenCalledWith({ include: { stages: true } })
    })
    it('should list quotas for a  non admin, userId provided)', async () => {
      prisma.quota.findMany.mockResolvedValue([{ stages: stageAssociated }])
      const response = await listQuotas(faker.string.uuid())
      expect(prisma.quota.findMany).toHaveBeenCalledTimes(1)
      expect(prisma.quota.findMany).toHaveBeenCalledWith({ include: { stages: true }, where: { OR: [{ isPrivate: false }, expect.any(Object)] } })
      expect(response[0].stageIds).toStrictEqual([stageAssociated[0].id])
    })
  })

  describe('getQuotaAssociatedEnvironments', () => {
    it('should list all quotas (admin, no userId provided)', async () => {
      const envName = faker.string.alpha(8)
      const projectSlug = faker.string.alpha(8)
      const stageName = faker.string.alpha(8)
      const ownerEmail = faker.internet.email()
      const envs = [{ name: envName, project: { slug: projectSlug, owner: { email: ownerEmail } }, stage: { name: stageName } }]
      prisma.environment.findMany.mockResolvedValue(envs)
      const response = await getQuotaAssociatedEnvironments(quota.id)
      expect(response).toStrictEqual([{
        name: envName,
        project: projectSlug,
        stage: stageName,
        owner: ownerEmail,
      }])
    })
  })
})
