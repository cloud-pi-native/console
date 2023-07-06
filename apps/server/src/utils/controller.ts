import { type ProjectRoles, adminGroupPath } from 'shared'
import { sendForbidden } from './response.js'
import { getEnvironmentsByProjectId } from '../queries/environment-queries.js'
import { getProjectRepositories } from '../queries/repository-queries.js'
import { getProjectById, lockProject, unlockProject } from '../queries/project-queries.js'
import type { Permission, Project, User, Role } from '@prisma/client'
import prisma from '@/prisma.js'

export const checkAdminGroup = (req, res, done) => {
  if (!req.session.user.groups?.includes(adminGroupPath)) {
    sendForbidden(res, 'Vous n\'avez pas les droits administrateur')
  }
  done()
}

export const unlockProjectIfNotFailed = async (projectId) => {
  const ressources = [
    ...(await getEnvironmentsByProjectId(projectId))?.map(environment => environment.status),
    ...(await getProjectRepositories(projectId))?.map(repository => repository.status),
    (await getProjectById(projectId))?.status,
  ]
  if (ressources.includes('failed')) {
    await lockProject(projectId)
  } else {
    await unlockProject(projectId)
  }
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
  projectId: Project['id']
  minRole?: ProjectRoles
}

type SearchOptions = RequireOnlyOne<IsAllowed, 'userList' | 'roles' | 'projectId'>

/**
 * Returns boolean if userId has minimum role in project
 * @param {number} userId User Id to check role
 * @param {Object} SearchOptions
 * @param {string} SearchOptions.usersList - List of users, check ids match against userId
 * @param {string} SearchOptions.projectUsers - List of users and role got by project query including Users, will be filtered if minrole given. Will be assigned to usersList
 * @param {string} SearchOptions.projectId - Project id, used to get projectUsers
 * @param {string} SearchOptions.minRole - Optionnal, Minimum role to have, 'user' or 'owner', undefined value equal 'user'
 * @return {Promise<boolean>} is userId has sufficent permissions
 */
export const hasRoleInProject = async (userId: User['id'], { userList, roles, projectId, minRole }: SearchOptions) => {
  // get project by id, assign result to projectUsers
  if (projectId) roles = await prisma.role.findMany({ where: { projectId } })
  if (roles) {
    // if minRole is 'owner' filter and assign to userList
    if (minRole === 'owner') userList = roles.filter(userProject => userProject.role === 'owner').map(({ userId }) => ({ id: userId }))
    // else assign to userList
    else userList = roles.map(({ userId }) => ({ id: userId }))
  }
  return userList.findIndex(user => user.id === userId) > -1
}

export const hasPermissionInEnvironment = async (userId: User['id'], permissions: Permission[], minLevel: Permission['level']) => {
  // get project by id, assign result to projectUsers
  const { level } = permissions.find(perm => perm.userId === userId)
  return level > minLevel
}

export const filterOwners = (roles: Role[]) => {
  return roles.filter(({ role }) => role === 'owner')
}

export type AsyncReturnType<T extends (...args: any) => Promise<any>> =
  T extends (...args: any) => Promise<infer R> ? R : any

export type ProjectInfos<T> = T & {
  services?: Record<string, object>
}
