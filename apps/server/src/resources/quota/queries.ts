import type { Quota, Stage, User } from '@prisma/client'
import prisma from '@/prisma.js'

export const listQuotas = (userId: User['id']) =>
  prisma.quota.findMany({
    where: {
      OR: [{
        isPrivate: false,
      }, {
        environments: { some: { project: { roles: { some: { userId } } } } },
      }],
    },
    include: {
      stages: true,
    },
  })

export const getAllQuotas = () =>
  prisma.quota.findMany({
    include: {
      stages: true,
    },
  })

export const getQuotaById = (id: Quota['id']) =>
  prisma.quota.findUnique({
    where: { id },
    include: { environments: true, stages: true },
  })

export const getQuotaByIdOrThrow = (id: Quota['id']) =>
  prisma.quota.findUniqueOrThrow({
    where: { id },
    include: { stages: true },
  })

export const getQuotaAssociatedEnvironmentById = (id: Quota['id']) =>
  prisma.environment.findMany({
    where: {
      quotaId: id,
    },
    select: {
      name: true,
      project: {
        select: {
          name: true,
          organization: {
            select: { name: true },
          },
          roles: {
            where: {
              role: 'owner',
            },
            select: {
              user: true,
              role: true,
            },
          },
        },
      },
      stage: true,
    },
  })

export const getQuotaByName = (name: Quota['name']) =>
  prisma.quota.findUnique({
    where: { name },
  })

// CREATE
type CreateQuotaParams = {
  memory: Quota['memory']
  cpu: Quota['cpu']
  name: Quota['name']
  isPrivate?: Quota['isPrivate']
}

export const createQuota = ({ memory, cpu, name, isPrivate = false }: CreateQuotaParams) =>
  prisma.quota.create({
    data: {
      memory,
      cpu,
      name,
      isPrivate,
    },
  })

export const updateQuotaPrivacy = (quotaId: Quota['id'], isPrivate: Quota['isPrivate']) =>
  prisma.quota.update({
    data: {
      isPrivate,
    },
    where: {
      id: quotaId,
    },
  })

export const updateQuotaLimits = (quotaId: Quota['id'], { memory, cpu }: Pick<Quota, 'cpu' | 'memory'>) =>
  prisma.quota.update({
    data: {
      memory,
      cpu,
    },
    where: {
      id: quotaId,
    },
  })

export const updateQuotaName = (id: Quota['id'], name: Quota['name']) =>
  prisma.quota.update({
    where: {
      id,
    },
    data: {
      name,
    },
  })

export const linkQuotaToStages = (quotaId: Quota['id'], stageIds: Stage['id'][]) =>
  Promise.all(stageIds.map(stageId => prisma.quota.update({
    where: {
      id: quotaId,
    },
    data: {
      stages: { connect: { id: stageId } },
    },
  })))
export const unlinkQuotaFromStages = (quotaId: Quota['id'], stageIds: Stage['id'][]) =>
  Promise.all(stageIds.map(stageId => prisma.quota.update({
    where: {
      id: quotaId,
    },
    data: {
      stages: { disconnect: { id: stageId } },
    },
  })))

export const deleteQuota = (quotaId: Quota['id']) =>
  prisma.quota.delete({ where: { id: quotaId } })
