import { ForbiddenError } from '@/utils/errors.js'
import { Project, User, Environment, Permission } from '@prisma/client'
import { checkAuthorization } from '@/resources/environment/business.js'
import { deletePermission, getEnvironmentPermissions, getProjectInfos, getSingleOwnerByProjectId, setPermission, updatePermission } from '@/resources/queries-index.js'
import { ProjectRoles } from 'shared'

export enum Action {
  update = 'modifiée',
  delete = 'supprimée'
}

export const checkProjectRole = async (
  projectId: Project['id'],
  userId: User['id'],
  role: ProjectRoles = 'user',
) => {
  const project = await getProjectInfos(projectId)
  const errorMessage = checkAuthorization(project, userId, role)
  if (errorMessage) throw new ForbiddenError(errorMessage, { description: '', extras: { userId, projectId: project.id } })
}

export const preventUpdatingOwnerPermission = async (
  projectId: Project['id'],
  userId: User['id'],
  action: Action = Action.update,
) => {
  const owner = await getSingleOwnerByProjectId(projectId)
  if (userId === owner.id) throw new ForbiddenError(`La permission du owner du projet ne peut être ${action}`)
}

export const getEnvironmentPermissionsBusiness = async (environmentId: Environment['id']) => {
  return getEnvironmentPermissions(environmentId)
}

export const setPermissionBusiness = async (
  userId: User['id'],
  environmentId: Environment['id'],
  level: Permission['level'],
) => {
  return setPermission({ userId, environmentId, level })
  // TODO chercher le nom de l'environnement associé et dériver les noms keycloak
  // if (data.level === 0) await removeMembers([data.userId], [permission.Environment.name])
  // if (data.level === 10) await removeMembers([data.userId], [permission.Environment.name]) && await addMembers([data.userId], [permission.Environment.name])
  // if (data.level === 20) await addMembers([data.userId], [permission.Environment.name])
}

export const updatePermissionBusiness = async (
  userId: User['id'],
  environmentId: Environment['id'],
  level: Permission['level'],
) => {
  return updatePermission({ userId, environmentId, level })
}

export const deletePermissionBusiness = async (
  userId: User['id'],
  environmentId: Environment['id'],
) => {
  return deletePermission(userId, environmentId)
}
