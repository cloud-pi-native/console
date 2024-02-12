import { BadRequestError, ForbiddenError, UnprocessableContentError } from '@/utils/errors.js'
import type { Project, User, Environment, Permission, Log } from '@prisma/client'
import { addLogs, deletePermission as deletePermissionQuery, getEnvironmentByIdWithCluster, getEnvironmentPermissions as getEnvironmentPermissionsQuery, getPermissionByUserIdAndEnvironmentId, getProjectInfos, getSingleOwnerByProjectId, getUserById, setPermission as setPermissionQuery, updatePermission as updatePermissionQuery } from '@/resources/queries-index.js'
import { checkInsufficientRoleInProject, checkRoleAndLocked } from '@/utils/controller.js'
import { hooks } from '@dso-console/hooks'
import { PermissionSchema } from '@dso-console/shared'
import { validateSchema } from '@/utils/business.js'

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
  const roles = (await getProjectInfos(projectId))?.roles
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
  requestId: Log['requestId'],
) => {
  const project = await getProjectInfos(projectId)

  const errorMessage = checkRoleAndLocked(project, requestorId)
  if (errorMessage) throw new ForbiddenError(errorMessage, undefined)

  const isUserProjectMember = project.roles?.some(role => role?.userId === userId)
  if (!isUserProjectMember) throw new BadRequestError('L\'utilisateur n\'est pas membre du projet', undefined)

  const schemaValidation = PermissionSchema.omit({ id: true }).safeParse({ userId, environmentId, level })
  validateSchema(schemaValidation)

  const permission = await setPermissionQuery({ userId, environmentId, level })
  const environment = await getEnvironmentByIdWithCluster(permission.environmentId)
  const user = await getUserById(userId)

  const results = await hooks.setEnvPermission.execute({
    environment: environment.name,
    cluster: environment.cluster,
    organization: project.organization.name,
    permissions: {
      ro: level >= 0,
      rw: level >= 1,
    },
    project: project.name,
    user,
  })
  // @ts-ignore
  await addLogs('Update Permission', results, userId, requestId)
  if (results.failed) {
    throw new UnprocessableContentError('Echec à la création de la permission')
  }
  return permission
}

export const updatePermission = async (
  projectId: Project['id'],
  requestorId: User['id'],
  userId: User['id'],
  environmentId: Environment['id'],
  level: Permission['level'],
  requestId: Log['requestId'],
) => {
  const project = await getProjectInfos(projectId)

  await preventUpdatingOwnerPermission(projectId, userId)

  const errorMessage = checkRoleAndLocked(project, requestorId)
  if (errorMessage) throw new ForbiddenError(errorMessage)

  const requestorPermission = await getPermissionByUserIdAndEnvironmentId(requestorId, environmentId)
  if (!requestorPermission?.length) throw new ForbiddenError('Vous n\'avez pas de droits sur cet environnement')

  const schemaValidation = PermissionSchema.omit({ id: true }).safeParse({ userId, environmentId, level })
  validateSchema(schemaValidation)

  const permission = await updatePermissionQuery({ userId, environmentId, level })
  const environment = await getEnvironmentByIdWithCluster(permission.environmentId)
  const user = await getUserById(userId)

  const results = await hooks.setEnvPermission.execute({
    environment: environment.name,
    cluster: environment.cluster,
    organization: project.organization.name,
    permissions: {
      ro: level >= 0,
      rw: level >= 1,
    },
    project: project.name,
    user,
  })
  // @ts-ignore
  await addLogs('Update Permission', results, userId, requestId)
  if (results.failed) {
    throw new UnprocessableContentError('Echec à l\'application de la permission')
  }
  return permission
}

export const deletePermission = async (
  userId: User['id'],
  environmentId: Environment['id'],
  requestorId: Environment['id'],
  requestId: Log['requestId'],
) => {
  const environment = await getEnvironmentByIdWithCluster(environmentId)
  const project = await getProjectInfos(environment.projectId)
  await preventUpdatingOwnerPermission(project.id, userId, Action.delete)
  const requestorPermission = await getPermissionByUserIdAndEnvironmentId(requestorId, environmentId)
  if (!requestorPermission?.length) throw new ForbiddenError('Vous n\'avez pas de droits sur cet environnement')
  const user = await getUserById(userId)
  const results = await hooks.setEnvPermission.execute({
    environment: environment.name,
    cluster: environment.cluster,
    organization: project.organization.name,
    permissions: {
      ro: false,
      rw: false,
    },
    project: project.name,
    user,
  })
  // @ts-ignore
  await addLogs('Delete Permission', results, userId, requestId)
  if (results.failed) {
    throw new UnprocessableContentError('Echec à la suppression de la permission')
  }
  return deletePermissionQuery(userId, environmentId)
}
