import { ForbiddenError } from '@/utils/errors.js'
import { Project, User, Environment, Permission } from '@prisma/client'
import { deletePermission, getEnvironmentPermissions, getProjectInfos, getProjectUsers, getSingleOwnerByProjectId, setPermission, updatePermission } from '@/resources/queries-index.js'
import { checkInsufficientRoleInProject, checkRoleAndLocked } from '@/utils/controller.js'

export enum Action {
  update = 'modifiée',
  delete = 'supprimée'
}

export const preventUpdatingOwnerPermission = async (
  projectId: Project['id'],
  userId: User['id'],
  action: Action = Action.update,
) => {
  const owner = await getSingleOwnerByProjectId(projectId)
  if (userId === owner.id) throw new ForbiddenError(`La permission du owner du projet ne peut être ${action}`)
}

export const getEnvironmentPermissionsBusiness = async (
  userId: User['id'],
  projectId: Project['id'],
  environmentId: Environment['id'],
) => {
  const userList = await getProjectUsers(projectId)
  const errorMessage = checkInsufficientRoleInProject(userId, { userList })
  if (errorMessage) throw new ForbiddenError(errorMessage, undefined)
  return getEnvironmentPermissions(environmentId)
}

export const setPermissionBusiness = async (
  projectId: Project['id'],
  requestorId: User['id'],
  userId: User['id'],
  environmentId: Environment['id'],
  level: Permission['level'],
) => {
  const project = await getProjectInfos(projectId)
  const errorMessage = checkRoleAndLocked(project, requestorId)
  if (errorMessage) throw new ForbiddenError(errorMessage, undefined)
  return setPermission({ userId, environmentId, level })
  // TODO chercher le nom de l'environnement associé et dériver les noms keycloak
  // if (data.level === 0) await removeMembers([data.userId], [permission.Environment.name])
  // if (data.level === 10) await removeMembers([data.userId], [permission.Environment.name]) && await addMembers([data.userId], [permission.Environment.name])
  // if (data.level === 20) await addMembers([data.userId], [permission.Environment.name])
}

export const updatePermissionBusiness = async (
  projectId: Project['id'],
  requestorId: User['id'],
  userId: User['id'],
  environmentId: Environment['id'],
  level: Permission['level'],
) => {
  const project = await getProjectInfos(projectId)
  const errorMessage = checkRoleAndLocked(project, requestorId)
  if (errorMessage) throw new ForbiddenError(errorMessage, undefined)
  return updatePermission({ userId, environmentId, level })
}

export const deletePermissionBusiness = async (
  userId: User['id'],
  environmentId: Environment['id'],
) => {
  return deletePermission(userId, environmentId)
}
