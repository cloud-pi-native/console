import type { Quota, Stage, User } from '@prisma/client'
import prisma from '@/prisma.js'

export function listQuotas(userId: User['id']) {
  return prisma.quota.findMany({
    where: {
      OR: [{
        isPrivate: false,
      }, {
        environments: { some: { project: { OR: [
          { members: { some: { userId } } },
          { ownerId: userId },
        ] } } },
      }],
    },
    include: {
      stages: true,
    },
  })
}

export function getAllQuotas() {
  return prisma.quota.findMany({
    include: {
      stages: true,
    },
  })
}

export function getQuotaById(id: Quota['id']) {
  return prisma.quota.findUnique({
    where: { id },
    include: { environments: true, stages: true },
  })
}

export function getQuotaByIdOrThrow(id: Quota['id']) {
  return prisma.quota.findUniqueOrThrow({
    where: { id },
    include: { stages: true },
  })
}

export function getQuotaAssociatedEnvironmentById(id: Quota['id']) {
  return prisma.environment.findMany({
    where: {
      quotaId: id,
    },
    select: {
      name: true,
      project: {
        select: {
          name: true,
          slug: true,
          owner: true,
        },
      },
      stage: true,
    },
  })
}

export function getQuotaByName(name: Quota['name']) {
  return prisma.quota.findUnique({
    where: { name },
  })
}

// CREATE
interface CreateQuotaParams {
  memory: Quota['memory']
  cpu: Quota['cpu']
  name: Quota['name']
  isPrivate?: Quota['isPrivate']
}

export function createQuota({ memory, cpu, name, isPrivate = false }: CreateQuotaParams) {
  return prisma.quota.create({
    data: {
      memory,
      cpu,
      name,
      isPrivate,
    },
  })
}

export function updateQuotaPrivacy(quotaId: Quota['id'], isPrivate: Quota['isPrivate']) {
  return prisma.quota.update({
    data: {
      isPrivate,
    },
    where: {
      id: quotaId,
    },
  })
}

export function updateQuotaLimits(quotaId: Quota['id'], { memory, cpu }: Pick<Quota, 'cpu' | 'memory'>) {
  return prisma.quota.update({
    data: {
      memory,
      cpu,
    },
    where: {
      id: quotaId,
    },
  })
}

export function updateQuotaName(id: Quota['id'], name: Quota['name']) {
  return prisma.quota.update({
    where: {
      id,
    },
    data: {
      name,
    },
  })
}

export function linkQuotaToStages(quotaId: Quota['id'], stageIds: Stage['id'][]) {
  return Promise.all(stageIds.map(stageId => prisma.quota.update({
    where: {
      id: quotaId,
    },
    data: {
      stages: { connect: { id: stageId } },
    },
  })))
}
export function unlinkQuotaFromStages(quotaId: Quota['id'], stageIds: Stage['id'][]) {
  return Promise.all(stageIds.map(stageId => prisma.quota.update({
    where: {
      id: quotaId,
    },
    data: {
      stages: { disconnect: { id: stageId } },
    },
  })))
}

export function deleteQuota(quotaId: Quota['id']) {
  return prisma.quota.delete({ where: { id: quotaId } })
}
