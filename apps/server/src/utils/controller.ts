import type { Cluster, ProjectRole, ProjectMembers, Project, Prisma } from '@prisma/client'
import { adminGroupPath, projectIsLockedInfo, PROJECT_PERMS as PP, XOR } from '@cpn-console/shared'
import { UserDetails } from '@/types/index.js'
import prisma from '@/prisma.js'

export const hasGroupAdmin = (groups: UserDetails['groups']) => groups.includes(adminGroupPath)

export type RequireOnlyOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>>
  & {
    [K in Keys]-?:
      Required<Pick<T, K>>
      & Partial<Record<Exclude<Keys, K>, undefined>>
  }[Keys]

type ErrorMessagePredicate = () => string | undefined
export const getErrorMessage = (...fns: ErrorMessagePredicate[]) => {
  for (const f of fns) {
    const error = f()
    if (error) {
      return error
    }
  }
}

/**
 * Renvoie une erreur si le projet est verrouillé
 */
export const checkProjectLocked = (
  project: { locked: boolean },
): string => project.locked
  ? projectIsLockedInfo
  : ''

export const checkLocked = (
  project: { locked: Project['locked'] },
): string => checkProjectLocked(project)

export const checkClusterUnavailable = (clusterId: Cluster['id'], authorizedClusterIds: Cluster['id'][]): string =>
  authorizedClusterIds.some(authorizedClusterId => authorizedClusterId === clusterId)
    ? ''
    : 'Ce cluster n\'est pas disponible pour cette combinaison projet et stage'

export const splitStringsFilterArray = <T extends Readonly<string[]>>(toMatch: T, inputs: string): T => inputs.split(',').filter(i => toMatch.includes(i)) as unknown as T

type StringArray = string[]
type WhereBuilderParams<T extends StringArray> = {
  enumValues: T
  eqValue: T[number] | undefined
  inValues: string | undefined
  notInValues: string | undefined
}

export const whereBuilder = <T extends StringArray>({ enumValues, eqValue, inValues, notInValues }: WhereBuilderParams<T>) => {
  if (eqValue) {
    return eqValue
  } else if (inValues) {
    return { in: splitStringsFilterArray(enumValues, inValues) }
  } else if (notInValues) {
    return { notIn: splitStringsFilterArray(enumValues, notInValues) }
  }
}

type ProjectMinimalPerms = Pick<Project, 'everyonePerms' | 'ownerId' | 'id' | 'locked' | 'status'> & { roles: ProjectRole[], members: ProjectMembers[] }
type UserProfile = { user: UserDetails, adminPermissions: bigint }
type UserProjectProfile = UserProfile & { projectPermissions?: bigint, projectId: Project['id'], projectLocked: boolean, projectStatus: Project['status'], projectOwnerId: Project['ownerId'] }

type ProjectUniqueFinder = XOR<
  { name: string, organizationName: string },
  XOR<{ environmentId: string }, XOR<{ repositoryId: string }, { id: string }>>>

const projectPermsSelect = { roles: true, members: true, everyonePerms: true, ownerId: true, id: true, locked: true, status: true } as const satisfies Prisma.ProjectSelect

export async function authUser(user: UserDetails): Promise<UserProfile>
export async function authUser(user: UserDetails, projectUnique: ProjectUniqueFinder): Promise<UserProjectProfile>
export async function authUser(user: UserDetails, projectUnique?: ProjectUniqueFinder): Promise<UserProfile | UserProjectProfile> {
  let adminPermissions = 0n
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (dbUser) {
    adminPermissions = await prisma.adminRole.findMany({
      where: {
        id: { in: dbUser.adminRoleIds },
      },
    }).then(role => role.reduce((acc, curr) => acc | curr.permissions, 0n))
  }

  if (!projectUnique) {
    return {
      user,
      adminPermissions,
    }
  }
  let project: ProjectMinimalPerms

  if (projectUnique.repositoryId) {
    project = (await prisma.repository.findUniqueOrThrow({
      where: { id: projectUnique.repositoryId },
      select: { project: { select: projectPermsSelect } },
    })).project
  } else if (projectUnique.environmentId) {
    project = (await prisma.environment.findUniqueOrThrow({
      where: { id: projectUnique.environmentId },
      select: { project: { select: projectPermsSelect } },
    })).project
  } else if (projectUnique.id) {
    project = await prisma.project.findUniqueOrThrow({
      where: { id: projectUnique.id },
      select: projectPermsSelect,
    })
  } else {
    project = await prisma.project.findFirstOrThrow({
      where: { name: projectUnique.name, organization: { name: projectUnique.organizationName } },
      select: projectPermsSelect,
    })
  }

  const projectPermissions = getProjectPermissions(project, user)

  return {
    user,
    adminPermissions,
    projectPermissions,
    projectId: project.id,
    projectLocked: project.locked,
    projectStatus: project.status,
    projectOwnerId: project.ownerId,
  }
}

const getProjectPermissions = (project: ProjectMinimalPerms, user: UserDetails): bigint | undefined => {
  if (project.ownerId === user.id) return PP.MANAGE
  const member = project.members.find(member => member.userId === user.id)
  if (!member) return

  const memberRoles = project.roles.filter(role => member.roleIds.includes(role.id))
  return memberRoles.reduce((acc, curr) => acc | curr.permissions, project.everyonePerms)
}

export class ErrorResType {
  status: 400 | 403 | 404 | 422
  body: { message: string } = { message: '' }
  constructor(code: 400 | 403 | 404 | 422) {
    this.status = code
  }
}
export class BadRequest400 extends ErrorResType {
  status = 400 as const
  constructor(message: string) {
    super(400)
    this.body.message = message ?? 'Bad request'
  }
}

export class Forbidden403 extends ErrorResType {
  status = 403 as const
  constructor(message?: string) {
    super(403)
    this.body.message = message ?? 'Forbidden'
  }
}

export class NotFound404 extends ErrorResType {
  status = 404 as const
  constructor() {
    super(404)
    this.body.message = 'Not Found'
  }
}

export class Unprocessable422 extends ErrorResType {
  status = 422 as const
  constructor(message?: string) {
    super(422)
    this.body.message = message ?? 'Unprocessable Entity'
  }
}
