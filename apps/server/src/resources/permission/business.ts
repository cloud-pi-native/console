import { BadRequestError, ForbiddenError } from '@/utils/errors.js'
import { Project, User, Environment, Permission } from '@prisma/client'
import { deletePermission as deletePermissionQuery, getEnvironmentPermissions as getEnvironmentPermissionsQuery, getProjectInfos, getSingleOwnerByProjectId, setPermission as setPermissionQuery, updatePermission as updatePermissionQuery } from '@/resources/queries-index.js'
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

export const getEnvironmentPermissions = async (
  userId: User['id'],
  projectId: Project['id'],
  environmentId: Environment['id'],
) => {
  const roles = (await getProjectInfos(projectId)).roles
  const errorMessage = checkInsufficientRoleInProject(userId, { roles })
  if (errorMessage) throw new ForbiddenError(errorMessage, undefined)
  return getEnvironmentPermissionsQuery(environmentId)
}

export const setPermission = async (
  projectId: Project['id'],
  requestorId: User['id'],
  userId: User['id'],
  environmentId: Environment['id'],
  level: Permission['level'],
) => {
  const project = await getProjectInfos(projectId)
  const errorMessage = checkRoleAndLocked(project, requestorId)
  if (errorMessage) throw new ForbiddenError(errorMessage, undefined)
  const isUserProjectMember = project.roles?.some(role => role?.userId === userId)
  if (!isUserProjectMember) throw new BadRequestError('L\'utilisateur n\'est pas membre du projet', undefined)
  return setPermissionQuery({ userId, environmentId, level })
  // TODO chercher le nom de l'environnement associé et dériver les noms keycloak
  // if (data.level === 0) await removeMembers([data.userId], [permission.Environment.name])
  // if (data.level === 10) await removeMembers([data.userId], [permission.Environment.name]) && await addMembers([data.userId], [permission.Environment.name])
  // if (data.level === 20) await addMembers([data.userId], [permission.Environment.name])
}

export const updatePermission = async (
  projectId: Project['id'],
  requestorId: User['id'],
  userId: User['id'],
  environmentId: Environment['id'],
  level: Permission['level'],
) => {
  const project = await getProjectInfos(projectId)
  const errorMessage = checkRoleAndLocked(project, requestorId)
  if (errorMessage) throw new ForbiddenError(errorMessage, undefined)
  return updatePermissionQuery({ userId, environmentId, level })
}

export const deletePermission = async (
  userId: User['id'],
  environmentId: Environment['id'],
) => {
  return deletePermissionQuery(userId, environmentId)
}
