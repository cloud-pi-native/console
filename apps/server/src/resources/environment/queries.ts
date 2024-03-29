import type { Environment, Project, Role, Cluster, QuotaStage } from '@prisma/client'
import prisma from '@/prisma.js'
import { getProjectById } from '../project/queries.js'
import { AllStatus } from '@cpn-console/shared'

// SELECT
export const getEnvironmentById = async (id: Environment['id']) => {
  return prisma.environment.findUnique({
    where: { id },
  })
}

export const getEnvironmentInfos = (id: Environment['id']) => prisma.environment.findUnique({
  where: { id },
  include: {
    project: {
      select: {
        organization: true,
        roles: {
          include: {
            user: true,
          },
        },
        name: true,
        id: true,
        status: true,
        services: false,
        repositories: {
          where: {
            isInfra: true,
          },
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
      include: {
        user: true,
      },
    },
    quotaStage: {
      select: {
        stage: {
          select: {
            name: true,
          },
        },
      },
    },
  },
})

export const getEnvironmentsByProjectId = async (projectId: Project['id']) => {
  return prisma.environment.findMany({
    where: { projectId },
    include: { project: true },
  })
}

export const getEnvironmentByIdWithCluster = async (id: Environment['id']) => {
  return prisma.environment.findUnique({
    where: { id },
    include: {
      cluster: {
        include: {
          kubeconfig: true,
        },
      },
    },
  })
}

export const getProjectByEnvironmentId = async (environmentId: Environment['id']) => {
  const env = await getEnvironmentById(environmentId)
  if (!env) return
  return getProjectById(env.projectId)
}

export const getEnvironmentsByQuotaStageId = async (quotaStageId: Environment['quotaStageId']) => prisma.environment.findMany({
  where: {
    quotaStageId,
  },
  include: {
    cluster: {
      select: {
        label: true,
      },
    },
    project: {
      select: {
        name: true,
        roles: {
          include: {
            user: true,
          },
        },
        organization: {
          select: {
            name: true,
          },
        },
      },
    },
  },
})

export const getProjectPartialEnvironments = async ({ projectId }) => {
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
export const initializeEnvironment = async ({ name, projectId, projectOwners, clusterId, quotaStageId }: { name: Environment['name'], projectId: Project['id'], projectOwners: Role[], clusterId: Cluster['id'], quotaStageId: QuotaStage['id'] }) => {
  return prisma.environment.create({
    data: {
      name,
      project: {
        connect: {
          id: projectId,
        },
      },
      quotaStage: {
        connect: {
          id: quotaStageId,
        },
      },
      cluster: {
        connect: {
          id: clusterId,
        },
      },
      status: AllStatus.INITIALIZING,
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
            where: {
              isInfra: true,
            },
          },
        },
      },
    },
  })
}

export const updateEnvironmentCreated = async (id: Environment['id']) => {
  return prisma.environment.update({
    where: {
      id,
    },
    data: {
      status: 'created',
    },
  })
}

export const updateEnvironmentFailed = async (id: Environment['id']) => {
  return prisma.environment.update({
    where: {
      id,
    },
    data: {
      status: 'failed',
    },
  })
}

export const updateEnvironment = async ({ id, quotaStageId }: { id: Environment['id'], quotaStageId: QuotaStage['id'] }) => {
  return prisma.environment.update({
    where: {
      id,
    },
    data: {
      quotaStageId,
    },
  })
}

// DELETE
export const updateEnvironmentDeleting = async (id: Environment['id']) => {
  return prisma.environment.update({
    where: {
      id,
    },
    data: {
      status: 'deleting',
    },
  })
}

export const deleteEnvironment = async (id: Environment['id']) => prisma.environment.delete({
  where: {
    id,
  },
})

// TECH
export const _dropEnvironmentsTable = async () => {
  await prisma.environment.deleteMany({})
}

export const _createEnvironment = async (data: Parameters<typeof prisma.environment.create>[0]['data']) => {
  await prisma.environment.create({ data })
}

export const _dropQuotaTable = async () => {
  await prisma.quota.deleteMany({})
}

export const _dropStageTable = async () => {
  await prisma.stage.deleteMany({})
}
