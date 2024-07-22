import type { Cluster, Quota, Stage } from '@prisma/client'
import prisma from '@/prisma.js'

export const listStages = () =>
  prisma.stage.findMany({
    include: {
      clusters: true,
      quotas: true,
    },
  })

export const getAllStageIds = async () =>
  (await prisma.stage.findMany({
    select: {
      id: true,
    },
  })).map(({ id }) => id)

export const getStageById = (id: Stage['id']) =>
  prisma.stage.findUnique({
    where: { id },
    include: {
      clusters: true,
      quotas: true,
    },
  })

export const getStageByIdOrThrow = (id: Stage['id']) =>
  prisma.stage.findUniqueOrThrow({
    where: { id },
    include: {
      clusters: true,
      quotas: true,
    },
  })

export const getStageAssociatedEnvironmentById = (id: Stage['id']) =>
  prisma.environment.findMany({
    where: {
      stageId: id,
    },
    select: {
      name: true,
      cluster: {
        select: {
          label: true,
        },
      },
      project: {
        select: {
          name: true,
          organization: {
            select: { name: true },
          },
          owner: true,
        },
      },
      quota: true,
    },
  })

export const getStageAssociatedEnvironmentLengthById = (id: Stage['id']) =>
  prisma.environment.count({
    where: {
      stageId: id,
    },
  })

export const getStageByName = (name: Stage['name']) =>
  prisma.stage.findUnique({
    where: { name },
  })

export const linkStageToClusters = (id: Stage['id'], clusterIds: Cluster['id'][]) =>
  prisma.stage.update({
    where: {
      id,
    },
    data: {
      clusters: {
        connect: clusterIds.map(clusterId => ({ id: clusterId })),
      },
    },
  })

export const createStage = ({ name }: { name: Stage['name'] }) =>
  prisma.stage.create({
    data: {
      name,
    },
  })

export const updateStageName = (id: Stage['id'], name: Stage['name']) =>
  prisma.stage.update({
    where: {
      id,
    },
    data: {
      name,
    },
  })

export const linkStageToQuotas = (stageId: Stage['id'], quotaIds: Quota['id'][]) =>
  Promise.all(quotaIds.map(quotaId => prisma.stage.update({
    where: {
      id: stageId,
    },
    data: {
      quotas: { connect: { id: quotaId } },
    },
  })))

export const unlinkStageFromQuotas = (stageId: Stage['id'], quotaIds: Quota['id'][]) =>
  Promise.all(quotaIds.map(quotaId => prisma.stage.update({
    where: {
      id: stageId,
    },
    data: {
      quotas: { disconnect: { id: quotaId } },
    },
  })))

export const deleteStage = (id: Stage['id']) =>
  prisma.stage.delete({
    where: { id },
  })
