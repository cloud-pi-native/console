import type { ProjectRole as SharedProjectRole } from '@cpn-console/shared'
import type { ProjectRole } from '@prisma/client'
import type { ProjectRoleWithProject } from './project-roles-queries.utils'
import { isSystemRoleType } from '@cpn-console/shared'
import { BadRequestException } from '@nestjs/common'

export interface ProjectRoleResponse {
  id: string
  name: string
  oidcGroup?: string | null
  type?: string | null
  permissions: string
  userCount?: number
}

export type CreateProjectRoleInput = Omit<SharedProjectRole, 'position' | 'id' | 'projectId'>
export type PatchProjectRoleInput = Pick<SharedProjectRole, 'id'> & Partial<Omit<SharedProjectRole, 'id' | 'projectId'>>
export type PatchProjectRolesInput = PatchProjectRoleInput[]

export function toProjectRoleResponse(
  role: ProjectRoleWithProject,
): ProjectRoleResponse {
  return {
    id: role.id,
    name: role.name,
    oidcGroup: stripProjectSlugFromOidcGroup(role.oidcGroup, role.project.slug),
    type: role.type ?? 'managed',
    permissions: role.permissions.toString(),
    userCount: role.project.members?.length ?? 0,
  }
}

export function buildUpdatedProjectRoles(
  projectSlug: string,
  dbRoles: ProjectRole[],
  roles: PatchProjectRolesInput,
): { requestedPositionsCount: number, updatedRoles: ProjectRole[] } {
  const requestedPositions = new Set<number>()
  const updatedRoles: ProjectRole[] = []

  for (const dbRole of dbRoles) {
    const matchingRole = roles.find(role => role.id === dbRole.id)
    if (!matchingRole) continue

    validateProjectRolePatch(dbRole, matchingRole)

    if (matchingRole.position !== undefined) {
      requestedPositions.add(matchingRole.position)
    }

    updatedRoles.push(mergeProjectRolePatch(projectSlug, dbRole, matchingRole))
  }

  return { requestedPositionsCount: requestedPositions.size, updatedRoles }
}

export function validatePatchedProjectRolePositions(dbRolesCount: number, requestedPositionsCount: number): void {
  if (requestedPositionsCount && requestedPositionsCount !== dbRolesCount) {
    throw new BadRequestException('Les numéros de position des rôles sont incohérentes')
  }
}

function validateProjectRolePatch(dbRole: ProjectRole, matchingRole: PatchProjectRoleInput): void {
  if (isSystemRoleType(dbRole.type)) {
    throw new BadRequestException('Ce rôle système ne peut pas être modifié')
  }

  if (isSystemRoleType(matchingRole.type)) {
    throw new BadRequestException('Impossible de modifier un rôle en rôle système')
  }

  if (matchingRole.oidcGroup && !matchingRole.oidcGroup.startsWith('/')) {
    throw new BadRequestException('oidcGroup doit commencer par /')
  }
}

function mergeProjectRolePatch(
  projectSlug: string,
  dbRole: ProjectRole,
  matchingRole: PatchProjectRoleInput,
): ProjectRole {
  const permissions = typeof matchingRole.permissions === 'string'
    ? BigInt(matchingRole.permissions)
    : dbRole.permissions
  const oidcGroup = typeof matchingRole.oidcGroup === 'string'
    ? `/${projectSlug}${matchingRole.oidcGroup}`
    : dbRole.oidcGroup

  return {
    id: dbRole.id,
    name: matchingRole.name ?? dbRole.name,
    permissions,
    position: matchingRole.position ?? dbRole.position,
    oidcGroup,
    type: matchingRole.type ?? dbRole.type,
    projectId: dbRole.projectId,
  }
}

const oidcRegexp = /^\/[^/]+/

function stripProjectSlugFromOidcGroup(oidcGroup: string, projectSlug: string): string | null {
  if (!oidcGroup.startsWith(`/${projectSlug}`)) {
    return oidcGroup.replace(oidcRegexp, '')
  }

  return oidcGroup.slice(projectSlug.length + 1)
}
