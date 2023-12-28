import { type ProjectRoles, adminGroupPath, projectIsLockedInfo } from '@dso-console/shared'
import type { Permission, User, Role, Cluster } from '@prisma/client'
import { ForbiddenError } from './errors.js'
import { FastifyRequest } from 'fastify'

export const checkAdminGroup = (req: FastifyRequest, _res, done) => {
  if (!req.session.user.groups?.includes(adminGroupPath)) {
    throw new ForbiddenError('Vous n\'avez pas les droits administrateur')
  }
  done()
}

export type RequireOnlyOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>>
  & {
    [K in Keys]-?:
    Required<Pick<T, K>>
    & Partial<Record<Exclude<Keys, K>, undefined>>
  }[Keys]

type IsAllowed = {
  userList: User[] | Pick<User, 'id'>[]
  roles: Role[]
  minRole?: ProjectRoles
}

type SearchOptions = RequireOnlyOne<IsAllowed, 'userList' | 'roles'>

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

/**
 * Renvoie une erreur si l'utilisateur n'a pas le rôle suffisant dans un projet
 * @param {number} userId Id du user dont il faut vérifier le rôle
 * @param {Object} SearchOptions
 * @param {string} SearchOptions.usersList - Liste d'utilisateurs, check si ids incluent userId
 * @param {string?} SearchOptions.minRole - Optionnel, role minimum requis, 'user' ou  'owner'. Si `undefined` : 'user'
 * @return {string} message d'erreur si rôle insuffisant / absence de rôle, sinon chaîne vide
 */
export const checkInsufficientRoleInProject = (
  userId: User['id'],
  { userList, roles, minRole }: SearchOptions,
): string => {
  if (roles) {
    // if minRole is 'owner' filter and assign to userList
    // else assign to userList
    userList = minRole === 'owner'
      ? roles
        .filter(role => role.role === 'owner')
        .map(({ userId }) => ({ id: userId }))
      : roles.map(({ userId }) => ({ id: userId }))
  }
  return userList.some(user => user?.id === userId)
    ? ''
    : 'Vous n’avez pas les permissions suffisantes dans le projet'
}

export const checkRoleAndLocked = (
  project: { locked: boolean, roles: Role[] },
  userId: string,
  minRole: ProjectRoles = 'user',
): string => checkProjectLocked(project) || checkInsufficientRoleInProject(userId, { minRole, roles: project.roles })

export const checkClusterUnavailable = (clusterId: Cluster['id'], authorizedClusterIds: Cluster['id'][]): string => authorizedClusterIds.some(authorizedClusterId => authorizedClusterId === clusterId)
  ? ''
  : 'Ce cluster n\'est pas disponible pour cette combinaison projet et stage'

export const checkInsufficientPermissionInEnvironment = (userId: User['id'], permissions: Permission[], minLevel: Permission['level']) => {
  // get project by id, assign result to projectUsers
  const { level } = permissions.find(perm => perm.userId === userId) ?? { level: -1 }
  return level >= minLevel
    ? ''
    : 'Vous n\'avez pas les droits suffisants pour requêter cet environnement'
}

export const filterOwners = (roles: Role[]) => {
  return roles.filter(({ role }) => role === 'owner')
}

export type ProjectInfos<T> = T & {
  services?: Record<string, object>
}
