import type { Environment, Project, Prisma } from '@prisma/client'
import prisma from '@/prisma.js'
import { Quota } from '@cpn-console/shared'

// SELECT
export const getEnvironmentByIdOrThrow = (id: Environment['id']) =>
  prisma.environment.findUniqueOrThrow({ where: { id }, include: { quota: true, stage: true } })

export const getEnvironmentInfos = (id: Environment['id']) =>
  prisma.environment.findUniqueOrThrow({
    where: { id },
    include: {
      project: {
        select: {
          organization: true,
          owner: true,
          name: true,
          id: true,
          status: true,
          repositories: {
            where: { isInfra: true },
          },
          locked: true,
          clusters: {
            select: {
              id: true,
              label: true,
              privacy: true,
              clusterResources: true,
            },
          },
        },
      },
      stage: true,
    },
  })

export const getEnvironmentsByProjectId = async (projectId: Project['id']) => prisma.environment.findMany({
  where: { projectId },
  include: {
    quota: true,
    stage: true,
  },
})

export const getEnvironmentByIdWithCluster = (id: Environment['id']) =>
  prisma.environment.findUnique({
    where: { id },
    include: {
      cluster: {
        include: { kubeconfig: true },
      },
    },
  })

// INSERT
export const initializeEnvironment = (
  data: Prisma.EnvironmentUncheckedCreateInput,
) => prisma.environment.create({
  data,
  include: {
    project: {
      include: {
        repositories: {
          where: { isInfra: true },
        },
      },
    },
  },
})

export const updateEnvironment = (
  { id, quotaId }: { id: Environment['id'], quotaId: Quota['id'] },
) =>
  prisma.environment.update({
    where: {
      id,
    },
    data: {
      quotaId,
    },
  })

// DELETE
export const deleteEnvironment = (id: Environment['id']) =>
  prisma.environment.delete({
    where: { id },
  })

export const deleteAllEnvironmentForProject = (id: Project['id']) =>
  prisma.environment.deleteMany({
    where: { projectId: id },
  })
