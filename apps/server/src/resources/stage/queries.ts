import type { Cluster, QuotaStage, Stage } from '@prisma/client'
import prisma from '@/prisma.js'

export const getStages = () =>
  prisma.stage.findMany({
    include: {
      clusters: true,
      quotaStage: true,
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
      quotaStage: true,
    },
  })

export const getStageByIdOrThrow = (id: Stage['id']) =>
  prisma.stage.findUniqueOrThrow({
    where: { id },
    include: {
      clusters: true,
      quotaStage: true,
    },
  })

export const getStageAssociatedEnvironmentById = (id: Stage['id']) =>
  prisma.environment.findMany({
    where: {
      quotaStage: {
        stageId: id,
      },
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
      quotaStage: {
        select: {
          quota: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  })

export const getStageAssociatedEnvironmentLengthById = (id: Stage['id']) =>
  prisma.environment.count({
    where: {
      quotaStage: {
        stageId: id,
      },
    },
  })

export const getStageByName = (name: Stage['name']) =>
  prisma.stage.findUnique({
    where: { name },
  })

export const getQuotaStageById = (id: QuotaStage['id']) =>
  prisma.quotaStage.findUnique({
    where: { id },
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

export const deleteStage = (id: Stage['id']) =>
  prisma.stage.delete({
    where: { id },
  })
