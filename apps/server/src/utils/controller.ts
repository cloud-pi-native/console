import type { Cluster, Prisma, Project, ProjectMembers, ProjectRole } from '@prisma/client'
import type { XOR } from '@cpn-console/shared'
import { PROJECT_PERMS as PP, PROJECT_PERMS, projectIsLockedInfo, tokenHeaderName, ADMIN_PERMS, toBigInt } from '@cpn-console/shared'
import type { FastifyRequest } from 'fastify'
import { Unauthorized401 } from './errors.js'
import { uuid } from './queries-tools.js'
import type { UserDetails } from '@/types/index.js'
import prisma from '@/prisma.js'
import { logViaSession, logViaToken } from '@/resources/user/business.js'
import { getSystemSettings } from '@/resources/system/settings/business.js'

export type RequireOnlyOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>>
  & {
    [K in Keys]-?:
      Required<Pick<T, K>>
      & Partial<Record<Exclude<Keys, K>, undefined>>
  }[Keys]

type ErrorMessagePredicate = () => string | undefined
export function getErrorMessage(...fns: ErrorMessagePredicate[]) {
  for (const f of fns) {
    const error = f()
    if (error) {
      return error
    }
  }
}

// Toggle legacy default permissions (pre-fine-grained behavior)
async function isLegacyDefaultPermissionsEnabled(): Promise<boolean> {
  const settings = await getSystemSettings('legacy-permissions')
  const setting = settings[0]
  return setting ? setting.value === 'on' : false
}

async function getEffectiveAdminPermissions(rawPerms: bigint): Promise<bigint> {
  const perms = toBigInt(rawPerms)
  if (!perms) return 0n
  const legacyDefaultEnabled = await isLegacyDefaultPermissionsEnabled()
  if (legacyDefaultEnabled) {
    const withoutManage = perms & ~ADMIN_PERMS.MANAGE
    return withoutManage | ADMIN_PERMS.MANAGE_PROJECTS
  }
  return perms
}

/**
 * Renvoie une erreur si le projet est verrouillé
 */
export function checkProjectLocked(project: { locked: boolean }): string {
  return project.locked
    ? projectIsLockedInfo
    : ''
}

export function checkLocked(project: { locked: Project['locked'] }): string {
  return checkProjectLocked(project)
}

export function checkClusterUnavailable(clusterId: Cluster['id'], authorizedClusterIds: Cluster['id'][]): string {
  return authorizedClusterIds.includes(clusterId)
    ? ''
    : 'Ce cluster n\'est pas disponible pour cette combinaison projet et stage'
}

export const splitStringsFilterArray = <T extends Readonly<string[]>>(toMatch: T, inputs: string): T => inputs.split(',').filter(i => toMatch.includes(i)) as unknown as T

type StringArray = string[]
interface WhereBuilderParams<T extends StringArray> {
  enumValues: T
  eqValue: T[number] | undefined
  inValues: string | undefined
  notInValues: string | undefined
}

export function whereBuilder<T extends StringArray>({ enumValues, eqValue, inValues, notInValues }: WhereBuilderParams<T>) {
  if (eqValue) {
    return eqValue
  } else if (inValues) {
    return { in: splitStringsFilterArray(enumValues, inValues) }
  } else if (notInValues) {
    return { notIn: splitStringsFilterArray(enumValues, notInValues) }
  }
}

type ProjectMinimalPerms = Pick<Project, 'everyonePerms' | 'ownerId' | 'id' | 'locked' | 'status'> & { roles: ProjectRole[], members: ProjectMembers[] }
export interface UserProfile { user?: UserDetails, adminPermissions: bigint, tokenId?: string }
export interface ProjectPermState { projectPermissions?: bigint, projectId: Project['id'], projectLocked: boolean, projectStatus: Project['status'], projectOwnerId: Project['ownerId'] }
export type UserProjectProfile = UserProfile & ProjectPermState

type ProjectUniqueFinder = XOR<
  { slug: string },
  XOR<{ environmentId: string }, XOR<{ repositoryId: string }, { id: string }>>
>

const projectPermsSelect = { roles: true, members: true, everyonePerms: true, ownerId: true, id: true, locked: true, status: true } as const satisfies Prisma.ProjectSelect

export async function authUser(req: FastifyRequest): Promise<UserProfile>
export async function authUser(req: FastifyRequest, projectUnique: ProjectUniqueFinder): Promise<UserProjectProfile>
export async function authUser(req: FastifyRequest, projectUnique?: ProjectUniqueFinder): Promise<UserProfile | UserProjectProfile> {
  let adminPermissions: bigint = 0n
  let tokenId: string | undefined
  let user: UserDetails | undefined

  if (req.session.user) {
    const loginResult = await logViaSession(req.session.user)
    user = {
      ...loginResult.user,
      groups: req.session.user.groups,
    }
    adminPermissions = loginResult.adminPerms
  } else {
    const tokenHeader = req.headers[tokenHeaderName]
    if (typeof tokenHeader === 'string') {
      const resultToken = await logViaToken(tokenHeader)
      if (typeof resultToken === 'string') {
        throw new Unauthorized401(resultToken)
      }
      adminPermissions = resultToken.adminPerms ?? 0n
      tokenId = resultToken.user.tokenId
      if (!user && resultToken.user) {
        user = { ...resultToken.user, groups: [] }
      }
    }
  }

  adminPermissions = await getEffectiveAdminPermissions(adminPermissions)

  const baseReturnInfos = {
    user,
    adminPermissions,
    tokenId,
  }
  if (!projectUnique || !user) {
    return baseReturnInfos
  }
  let project: ProjectMinimalPerms | null | undefined

  if (projectUnique.repositoryId) {
    project = (await prisma.repository.findUnique({
      where: { id: projectUnique.repositoryId },
      select: { project: { select: projectPermsSelect } },
    }))?.project
  } else if (projectUnique.environmentId) {
    project = (await prisma.environment.findUnique({
      where: { id: projectUnique.environmentId },
      select: { project: { select: projectPermsSelect } },
    }))?.project
  } else if (projectUnique.id) {
    project = uuid.test(projectUnique.id)
      ? await prisma.project.findUnique({
        where: { id: projectUnique.id },
        select: projectPermsSelect,
      })
      : await prisma.project.findUnique({
        where: { slug: projectUnique.id },
        select: projectPermsSelect,
      })
  } else if (projectUnique.slug) {
    project = await prisma.project.findFirstOrThrow({
      where: { slug: projectUnique.slug },
      select: projectPermsSelect,
    })
  }
  if (!project) {
    return baseReturnInfos
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

function getProjectPermissions(project: ProjectMinimalPerms, user: UserDetails): bigint | undefined {
  if (project.ownerId === user.id) return PP.MANAGE
  const member = project.members.find(member => member.userId === user.id)
  if (!member) return

  const memberRoles = project.roles.filter(role => member.roleIds.includes(role.id))
  return memberRoles.reduce((acc, curr) => acc | curr.permissions, project.everyonePerms | PROJECT_PERMS.GUEST)
}
