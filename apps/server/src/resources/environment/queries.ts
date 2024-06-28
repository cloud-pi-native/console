import type { Environment, Project, Role, Cluster, QuotaStage } from '@prisma/client'
import prisma from '@/prisma.js'
import { getProjectById } from '../project/queries.js'

// SELECT
export const getEnvironmentById = (id: Environment['id']) =>
  prisma.environment.findUnique({ where: { id } })

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
      quotaStage: {
        select: {
          stage: {
            select: { name: true },
          },
        },
      },
    },
  })

export const getEnvironmentsByProjectId = async (projectId: Project['id']) => prisma.environment.findMany({
  where: { projectId },
  include: {
    permissions: true,
    quotaStage: {
      include: {
        stage: {
          include: {
            quotaStage: true,
          },
        },
        quota: true,
      },
    },
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

export const getEnvironmentsByQuotaStageId = (quotaStageId: Environment['quotaStageId']) =>
  prisma.environment.findMany({
    where: {
      quotaStageId,
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
      quotaStage: {
        select: {
          stage: {
            select: {
              name: true,
            },
          },
        },
      },
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
      stage: environment.quotaStage.stage.name,
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
  quotaStageId: QuotaStage['id']
}
export const initializeEnvironment = (
  { name, projectId, projectOwners, clusterId, quotaStageId }: CreateEnvironmentParams,
) => prisma.environment.create({
  data: {
    name,
    project: {
      connect: { id: projectId },
    },
    quotaStage: {
      connect: { id: quotaStageId },
    },
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
  { id, quotaStageId }: { id: Environment['id'], quotaStageId: QuotaStage['id'] },
) =>
  prisma.environment.update({
    where: {
      id,
    },
    data: {
      quotaStageId,
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
