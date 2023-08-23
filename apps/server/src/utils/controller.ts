import { type ProjectRoles, adminGroupPath } from 'shared'
import { sendForbidden } from './response.js'
import type { Permission, User, Role } from '@prisma/client'

export const checkAdminGroup = (req, res, done) => {
  if (!req.session.user.groups?.includes(adminGroupPath)) {
    sendForbidden(res, 'Vous n\'avez pas les droits administrateur')
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
 * Vérifie si un utilisateur a le rôle suffisant dans un projet
 * @param {number} userId Id du user dont il faut vérifier le rôle
 * @param {Object} SearchOptions
 * @param {string} SearchOptions.usersList - Liste d'utilisateurs, check si ids incluent userId
 * @param {string?} SearchOptions.minRole - Optionnel, role minimum requis, 'user' ou  'owner'. Si `undefined` : 'user'
 * @return {string} message d'erreur si rôle insuffisant / absence de rôle, sinon chaîne vide
 */
export const checkInsufficientRoleInProject = (userId: User['id'], { userList, roles, minRole }: SearchOptions) => {
  if (roles) {
    // if minRole is 'owner' filter and assign to userList
    if (minRole === 'owner') userList = roles.filter(userProject => userProject.role === 'owner').map(({ userId }) => ({ id: userId }))
    // else assign to userList
    else userList = roles.map(({ userId }) => ({ id: userId }))
  }
  return userList.some(user => user.id === userId)
    ? ''
    : 'Vous n’avez pas les permissions suffisantes dans le projet'
}

export const checkClusterUnavailable = (clustersId: string[], authorizedClusters: { id: string }[]) => clustersId
  .some(clusterId => !authorizedClusters
    .some(cluster => cluster.id === clusterId))
  ? 'Ce cluster n\'est pas disponible sur pour ce projet'
  : ''

export const checkInsufficientPermissionInEnvironment = (userId: User['id'], permissions: Permission[], minLevel: Permission['level']) => {
  // get project by id, assign result to projectUsers
  const { level } = permissions.find(perm => perm.userId === userId)
  return level >= minLevel
    ? ''
    : 'Vous n\'avez pas les droits suffisants pour requêter cet environnment'
}

export const filterOwners = (roles: Role[]) => {
  return roles.filter(({ role }) => role === 'owner')
}

export type AsyncReturnType<T extends (...args: any) => Promise<any>> =
  T extends (...args: any) => Promise<infer R> ? R : any

export type ProjectInfos<T> = T & {
  services?: Record<string, object>
}
