import type { CreateProjectBody } from '@cpn-console/shared'
import type { Prisma } from '@prisma/client'
import type { ProjectWithDetails } from './project-datastore.service'
import { PROJECT_PERMS, ProjectSchemaV2 } from '@cpn-console/shared'
import { ProjectStatus } from '@prisma/client'
import { z } from 'zod'

export function generateSlug(prefix: string, existingSlugs: string[] = []) {
  if (!existingSlugs.includes(prefix)) return prefix

  let suffix = 1
  while (existingSlugs.includes(`${prefix}-${suffix}`)) {
    suffix += 1
  }
  return `${prefix}-${suffix}`
}

export function generateProjectCreateInput(
  data: CreateProjectBody,
  ownerId: string,
  slug: string,
): Prisma.ProjectCreateInput {
  return {
    name: data.name,
    slug,
    description: data.description ?? '',
    status: ProjectStatus.created,
    locked: false,
    limitless: z.boolean().parse(data.limitless),
    hprodCpu: data.hprodCpu,
    hprodGpu: data.hprodGpu,
    hprodMemory: data.hprodMemory,
    prodCpu: data.prodCpu,
    prodGpu: data.prodGpu,
    prodMemory: data.prodMemory,
    owner: { connect: { id: ownerId } },
    roles: {
      create: [
        {
          name: 'Administrateur',
          permissions: PROJECT_PERMS.MANAGE,
          position: 0,
          oidcGroup: `/${slug}/console/admin`,
          type: 'system:managed',
        },
        {
          name: 'DevOps',
          permissions: PROJECT_PERMS.MANAGE_ENVIRONMENTS
            | PROJECT_PERMS.MANAGE_REPOSITORIES
            | PROJECT_PERMS.REPLAY_HOOKS
            | PROJECT_PERMS.SEE_SECRETS
            | PROJECT_PERMS.LIST_ENVIRONMENTS
            | PROJECT_PERMS.LIST_REPOSITORIES,
          position: 1,
          oidcGroup: `/${slug}/console/devops`,
          type: 'system:managed',
        },
        {
          name: 'Développeur',
          permissions: PROJECT_PERMS.MANAGE_REPOSITORIES
            | PROJECT_PERMS.LIST_ENVIRONMENTS
            | PROJECT_PERMS.LIST_REPOSITORIES,
          position: 2,
          oidcGroup: `/${slug}/console/developer`,
          type: 'system:managed',
        },
        {
          name: 'Lecture seule',
          permissions: PROJECT_PERMS.LIST_ENVIRONMENTS | PROJECT_PERMS.LIST_REPOSITORIES,
          position: 3,
          oidcGroup: `/${slug}/console/readonly`,
          type: 'system:managed',
        },
      ],
    },
  }
}

export function generateProjectV2(project: ProjectWithDetails) {
  const payload = {
    id: project.id,
    name: project.name,
    slug: project.slug,
    description: project.description,
    status: project.status,
    locked: project.locked,
    limitless: project.limitless,
    hprodCpu: project.hprodCpu,
    hprodGpu: project.hprodGpu,
    hprodMemory: project.hprodMemory,
    prodCpu: project.prodCpu,
    prodGpu: project.prodGpu,
    prodMemory: project.prodMemory,
    everyonePerms: project.everyonePerms,
    ownerId: project.ownerId,
    owner: project.owner,
    members: project.members.map(m => ({
      userId: m.user.id,
      email: m.user.email,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      roleIds: m.roleIds,
    })),
    roles: project.roles.map(role => ({
      id: role.id,
      name: role.name,
      permissions: role.permissions,
      position: role.position,
      projectId: role.projectId,
      oidcGroup: role.oidcGroup ? role.oidcGroup.replace(`/${project.slug}`, '') : '',
      type: role.type,
    })),
    clusterIds: project.clusters.map(c => c.id),
    lastSuccessProvisionningVersion: project.lastSuccessProvisionningVersion,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  }

  return ProjectSchemaV2.parse(payload)
}
