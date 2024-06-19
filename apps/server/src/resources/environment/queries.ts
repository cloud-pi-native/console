import type { Environment, Project, Role, Cluster, Stage } from '@prisma/client'
import prisma from '@/prisma.js'
import { getProjectById } from '../project/queries.js'
import { Quota } from '@cpn-console/shared'

// SELECT
export const getEnvironmentById = (id: Environment['id']) =>
  prisma.environment.findUnique({ where: { id }, include: { quota: true, stage: true } })

export const getEnvironmentInfos = (id: Environment['id']) =>
  prisma.environment.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          organization: true,
          roles: {
            include: { user: true },
          },
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
      permissions: {
        include: { user: true },
      },
      stage: true,
    },
  })

export const getEnvironmentsByProjectId = async (projectId: Project['id']) => prisma.environment.findMany({
  where: { projectId },
  include: {
    permissions: true,
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

export const getProjectByEnvironmentId = async (environmentId: Environment['id']) => {
  const env = await getEnvironmentById(environmentId)
  if (!env) return
  return getProjectById(env.projectId)
}

export const getEnvironmentsByQuotaAndStage = async ({ quotaId, stageId }: { quotaId: Quota['id'], stageId: Stage['id'] }) =>
  prisma.environment.findMany({
    where: {
      AND: [{
        quotaId,
      }, {
        stageId,
      }],
    },
    include: {
      cluster: {
        select: { label: true },
      },
      project: {
        select: {
          name: true,
          roles: {
            include: { user: true },
          },
          organization: {
            select: { name: true },
          },
        },
      },
    },
  })

export const getProjectPartialEnvironments = async ({ projectId }: { projectId: Project['id'] }) => {
  const environments = await prisma.environment.findMany({
    where: {
      projectId,
    },
    select: {
      name: true,
      stage: true,
      cluster: {
        select: {
          label: true,
        },
      },
    },
  })
  return environments?.map(environment =>
    ({
      environment: environment.name,
      stage: environment.stage.name,
      clusterLabel: environment.cluster.label,
    }),
  )
}

// INSERT
type CreateEnvironmentParams = {
  name: Environment['name'],
  projectId: Project['id'],
  projectOwners: Role[],
  clusterId: Cluster['id'],
  stageId: Stage['id'],
  quotaId: Quota['id'],
}
export const initializeEnvironment = (
  { name, projectId, projectOwners, clusterId, stageId, quotaId }: CreateEnvironmentParams,
) => prisma.environment.create({
  data: {
    name,
    project: {
      connect: { id: projectId },
    },
    quota: { connect: { id: quotaId } },
    stage: { connect: { id: stageId } },
    cluster: {
      connect: { id: clusterId },
    },
    permissions: {
      createMany: {
        data: projectOwners.map(({ userId }) => ({ userId, level: 2 })),
      },
    },
  },
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

// TECH
export const _dropEnvironmentsTable = prisma.environment.deleteMany

export const _createEnvironment = (data: Parameters<typeof prisma.environment.create>[0]['data']) =>
  prisma.environment.create({ data })

export const _dropQuotaTable = prisma.quota.deleteMany

export const _dropStageTable = prisma.stage.deleteMany
