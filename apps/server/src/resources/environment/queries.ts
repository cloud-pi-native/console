import type { Quota } from '@cpn-console/shared'
import type { Environment, Prisma, Project } from '@prisma/client'
import prisma from '@/prisma.js'

// SELECT
export function getEnvironmentByIdOrThrow(id: Environment['id']) {
  return prisma.environment.findUniqueOrThrow({ where: { id }, include: { quota: true, stage: true } })
}

export function getEnvironmentInfos(id: Environment['id']) {
  return prisma.environment.findUniqueOrThrow({
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
}

export async function getEnvironmentsByProjectId(projectId: Project['id']) {
  return prisma.environment.findMany({
    where: { projectId },
    include: {
      quota: true,
      stage: true,
    },
  })
}

export function getEnvironmentByIdWithCluster(id: Environment['id']) {
  return prisma.environment.findUnique({
    where: { id },
    include: {
      cluster: {
        include: { kubeconfig: true },
      },
    },
  })
}

// INSERT
export function initializeEnvironment(data: Prisma.EnvironmentUncheckedCreateInput) {
  return prisma.environment.create({
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
}

export function updateEnvironment({ id, quotaId }: { id: Environment['id'], quotaId: Quota['id'] }) {
  return prisma.environment.update({
    where: {
      id,
    },
    data: {
      quotaId,
    },
  })
}

// DELETE
export function deleteEnvironment(id: Environment['id']) {
  return prisma.environment.delete({
    where: { id },
  })
}

export function deleteAllEnvironmentForProject(id: Project['id']) {
  return prisma.environment.deleteMany({
    where: { projectId: id },
  })
}
