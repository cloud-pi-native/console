import type { CreateProjectBody, projectContract } from '@cpn-console/shared'
import type { Prisma } from '@prisma/client'
import type { ProjectDetails } from './project-queries.utils'
import { PROJECT_PERMS, ProjectSchemaV2, ProjectStatusSchema } from '@cpn-console/shared'
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

export const ProjectV2ResponseSchema = ProjectSchemaV2.omit({ name: true }).extend({
  name: z.string(),
})

export function generateProjectV2(project: ProjectDetails) {
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

  return ProjectV2ResponseSchema.parse(payload)
}

export function generateProjectWhereInput(opts: {
  query: typeof projectContract.listProjects.query._type
  requestorUserId: string
  appVersion: string
}): Prisma.ProjectWhereInput[] {
  const projectStatus = ProjectStatusSchema.options
  const { status, statusIn, statusNotIn, filter = 'member', ...rest } = opts.query

  const whereAnd: Prisma.ProjectWhereInput[] = []
  if (rest.id) whereAnd.push({ id: rest.id })
  if (rest.locked !== undefined) whereAnd.push({ locked: rest.locked })
  if (rest.name) whereAnd.push({ name: rest.name })
  if (rest.description) whereAnd.push({ description: { contains: rest.description } })

  const statusWhere = parseEnumWhereFilter({
    enumValues: projectStatus,
    eqValue: status,
    inValues: statusIn,
    notInValues: statusNotIn,
  })
  if (statusWhere) whereAnd.push({ status: statusWhere })

  if (rest.lastSuccessProvisionningVersion) {
    if (rest.lastSuccessProvisionningVersion === 'outdated') {
      whereAnd.push({ lastSuccessProvisionningVersion: { not: opts.appVersion } })
    } else if (rest.lastSuccessProvisionningVersion === 'last') {
      whereAnd.push({ lastSuccessProvisionningVersion: { equals: opts.appVersion } })
    } else {
      whereAnd.push({ lastSuccessProvisionningVersion: rest.lastSuccessProvisionningVersion })
    }
  }

  if (rest.search) {
    whereAnd.push({
      OR: [
        { name: { contains: rest.search } },
        { owner: { email: { contains: rest.search } } },
      ],
    })
  }

  if (filter === 'owned') {
    whereAnd.push({ ownerId: opts.requestorUserId })
  } else if (filter === 'member') {
    whereAnd.push({
      OR: [
        { members: { some: { userId: opts.requestorUserId } } },
        { ownerId: opts.requestorUserId },
      ],
    })
  }

  return whereAnd
}

export function parseEnumWhereFilter<T extends readonly string[]>({
  enumValues,
  eqValue,
  inValues,
  notInValues,
}: {
  enumValues: T
  eqValue: T[number] | undefined
  inValues: string | undefined
  notInValues: string | undefined
}):
  | T[number]
  | { in: T[number][] }
  | { notIn: T[number][] }
  | undefined {
  if (eqValue) {
    return eqValue
  }
  if (inValues) {
    return { in: parseCsvEnumList(enumValues, inValues) }
  }
  if (notInValues) {
    return { notIn: parseCsvEnumList(enumValues, notInValues) }
  }
}

const ProjectUpdateDataSchema = z.object({
  description: z.string().optional(),
  locked: z.boolean().optional(),
  limitless: z.boolean().optional(),
  hprodCpu: z.number().optional(),
  hprodGpu: z.number().optional(),
  hprodMemory: z.number().optional(),
  prodCpu: z.number().optional(),
  prodGpu: z.number().optional(),
  prodMemory: z.number().optional(),
  everyonePerms: z.union([z.string(), z.number(), z.bigint()]).transform(BigInt).optional(),
}).passthrough()

export function parseProjectUpdateInput(effectiveData: Record<string, unknown>): Prisma.ProjectUpdateInput {
  return ProjectUpdateDataSchema.parse(effectiveData) satisfies Prisma.ProjectUpdateInput
}

function parseCsvEnumList<T extends readonly string[]>(toMatch: T, inputs: string): T[number][] {
  return inputs.split(',').filter(i => toMatch.includes(i))
}
