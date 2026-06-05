import type { Prisma } from '@prisma/client'

export const projectSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  status: true,
  locked: true,
  limitless: true,
  hprodCpu: true,
  hprodGpu: true,
  hprodMemory: true,
  prodCpu: true,
  prodGpu: true,
  prodMemory: true,
  everyonePerms: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  lastSuccessProvisionningVersion: true,
  owner: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      adminRoleIds: true,
      type: true,
      createdAt: true,
      updatedAt: true,
      lastLogin: true,
    },
  },
  members: {
    select: {
      roleIds: true,
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          adminRoleIds: true,
          type: true,
          createdAt: true,
          updatedAt: true,
          lastLogin: true,
        },
      },
    },
  },
  plugins: {
    select: {
      pluginName: true,
      key: true,
      value: true,
    },
  },
  roles: {
    select: {
      id: true,
      name: true,
      permissions: true,
      position: true,
      oidcGroup: true,
      type: true,
      projectId: true,
    },
  },
  repositories: {
    select: {
      id: true,
      internalRepoName: true,
      isInfra: true,
      isPrivate: true,
      externalRepoUrl: true,
      externalUserName: true,
      helmValuesFiles: true,
      deployRevision: true,
      deployPath: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  environments: {
    select: {
      id: true,
      name: true,
      cpu: true,
      gpu: true,
      memory: true,
      autosync: true,
      clusterId: true,
      stageId: true,
      cluster: {
        select: {
          id: true,
          label: true,
          zone: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
  },
  deployments: {
    select: {
      id: true,
      name: true,
      autosync: true,
      createdAt: true,
      updatedAt: true,
      environment: {
        select: {
          id: true,
          name: true,
          cluster: {
            select: {
              id: true,
              label: true,
              zone: {
                select: {
                  slug: true,
                },
              },
            },
          },
          cpu: true,
          gpu: true,
          memory: true,
          autosync: true,
        },
      },
      deploymentSources: {
        select: {
          id: true,
          type: true,
          path: true,
          targetRevision: true,
          helmValuesFiles: true,
          repository: {
            select: {
              id: true,
              internalRepoName: true,
            },
          },
        },
      },
    },
  },
  clusters: {
    select: {
      id: true,
      label: true,
      zone: {
        select: {
          slug: true,
        },
      },
    },
  },
} satisfies Prisma.ProjectSelect

export const projectForUpdateSelect = {
  id: true,
  ownerId: true,
  status: true,
  locked: true,
  members: {
    select: {
      userId: true,
      user: {
        select: {
          type: true,
        },
      },
    },
  },
} satisfies Prisma.ProjectSelect

export const projectForDataSelect = {
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  environments: {
    select: {
      name: true,
      stage: true,
      cluster: {
        select: { label: true },
      },
    },
  },
  owner: true,
} satisfies Prisma.ProjectSelect

export const projectIdSelect = {
  id: true,
} satisfies Prisma.ProjectSelect

export const projectSlugSelect = {
  slug: true,
} satisfies Prisma.ProjectSelect

export const projectOwnerIdSelect = {
  ownerId: true,
} satisfies Prisma.ProjectSelect

export type ProjectDetails = Prisma.ProjectGetPayload<{
  select: typeof projectSelect
}>

export type ProjectUpdateContext = Prisma.ProjectGetPayload<{
  select: typeof projectForUpdateSelect
}>

export type ProjectDataExport = Prisma.ProjectGetPayload<{
  select: typeof projectForDataSelect
}>

export type ProjectId = Prisma.ProjectGetPayload<{
  select: typeof projectIdSelect
}>

export type ProjectSlug = Prisma.ProjectGetPayload<{
  select: typeof projectSlugSelect
}>

export type ProjectOwnerId = Prisma.ProjectGetPayload<{
  select: typeof projectOwnerIdSelect
}>

export function getProject(db: Prisma.TransactionClient, projectId: string) {
  return db.project.findUnique({ where: { id: projectId }, select: projectSelect })
}

export function getProjectNotArchived(db: Prisma.TransactionClient, projectId: string) {
  return db.project.findFirst({ where: { id: projectId, status: { not: 'archived' } }, select: projectSelect })
}

export function listProjects(db: Prisma.TransactionClient, whereAnd: Prisma.ProjectWhereInput[]) {
  return db.project.findMany({
    where: { AND: whereAnd },
    select: projectSelect,
  })
}

export function listProjectSlugsForPrefix(db: Prisma.TransactionClient, prefix: string) {
  return db.project.findMany({
    where: { slug: { startsWith: prefix } },
    select: projectSlugSelect,
  })
}

export function getProjectSlug(db: Prisma.TransactionClient, projectId: string) {
  return db.project.findUnique({ where: { id: projectId }, select: projectSlugSelect })
}

export function getProjectOwnerId(db: Prisma.TransactionClient, projectId: string) {
  return db.project.findUnique({ where: { id: projectId }, select: projectOwnerIdSelect })
}

export function listProjectIdsNotArchived(db: Prisma.TransactionClient) {
  return db.project.findMany({
    select: projectIdSelect,
    where: { status: { not: 'archived' } },
  })
}

export function updateProjectLocked(db: Prisma.TransactionClient, projectId: string, locked: boolean) {
  return db.project.update({
    where: { id: projectId },
    data: { locked },
  })
}

export function listProjectsForDataExport(db: Prisma.TransactionClient) {
  return db.project.findMany({
    select: projectForDataSelect,
  })
}

export function createProject(tx: Prisma.TransactionClient, data: Prisma.ProjectCreateInput) {
  return tx.project.create({
    data,
    select: projectIdSelect,
  })
}

export function getNotArchivedProjectForUpdate(tx: Prisma.TransactionClient, projectId: string) {
  return tx.project.findFirst({
    where: { id: projectId, status: { not: 'archived' } },
    select: projectForUpdateSelect,
  })
}

export function updateProject(tx: Prisma.TransactionClient, projectId: string, data: Prisma.ProjectUpdateInput) {
  return tx.project.update({ where: { id: projectId }, data })
}

export function deleteProjectDependencies(tx: Prisma.TransactionClient, projectId: string) {
  return Promise.all([
    tx.repository.deleteMany({ where: { projectId } }),
    tx.environment.deleteMany({ where: { projectId } }),
    tx.deployment.deleteMany({ where: { projectId } }),
  ])
}

export function getHumanUser(tx: Prisma.TransactionClient, opts: { userId?: string, email?: string }) {
  const { userId, email } = opts
  return tx.user.findFirst({
    where: {
      type: 'human',
      ...(typeof userId === 'string' ? { id: userId } : {}),
      ...(typeof email === 'string' ? { email } : {}),
    },
  })
}
