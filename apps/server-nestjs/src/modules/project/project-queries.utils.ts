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

export function getProject(db: Prisma.TransactionClient, projectId: string) {
  return db.project.findUnique({ where: { id: projectId }, select: projectSelect })
}

export type ProjectDetails = Prisma.ProjectGetPayload<{
  select: typeof projectSelect
}>

export function getProjectNotArchived(db: Prisma.TransactionClient, projectId: string) {
  return db.project.findFirst({ where: { id: projectId, status: { not: 'archived' } }, select: projectSelect })
}
