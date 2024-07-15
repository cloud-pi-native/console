import type { Environment, Permission, Project, User } from '@prisma/client'
import { PermissionSchema } from '@cpn-console/shared'
import { addLogs, deletePermission as deletePermissionQuery, getEnvironmentByIdWithCluster, getEnvironmentPermissions as getEnvironmentPermissionsQuery, getPermissionByUserIdAndEnvironmentId, getProjectInfos, getSingleOwnerByProjectId, setPermission as setPermissionQuery } from '@/resources/queries-index.js'
import { validateSchema } from '@/utils/business.js'
import { checkInsufficientRoleInProject, checkRoleAndLocked } from '@/utils/controller.js'
import { BadRequestError, ForbiddenError, NotFoundError, UnprocessableContentError } from '@/utils/errors.js'
import { hook } from '@/utils/hook-wrapper.js'

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
  if (userId === owner?.id) throw new ForbiddenError(`La permission du owner du projet ne peut être ${action}`)
}

export const getEnvironmentPermissions = async (
  userId: User['id'],
  projectId: Project['id'],
  environmentId: Environment['id'],
) => {
  const roles = (await getProjectInfos(projectId))?.roles ?? []
  const errorMessage = checkInsufficientRoleInProject(userId, { roles })
  if (errorMessage) throw new ForbiddenError(errorMessage)
  return getEnvironmentPermissionsQuery(environmentId)
}

export const upsertPermission = async (
  projectId: Project['id'],
  requestorId: User['id'],
  userId: User['id'],
  environmentId: Environment['id'],
  level: Permission['level'],
  requestId: string,
) => {
  const project = await getProjectInfos(projectId)
  if (!project) throw new BadRequestError('Le projet n\'existe pas')

  const ownerIds = project.roles
    .filter(({ role }) => role === 'owner')
    .map(({ userId }) => userId)

  const errorMessage = checkRoleAndLocked(project, requestorId)
  if (errorMessage) throw new ForbiddenError(errorMessage)

  const requestorPermission = await getPermissionByUserIdAndEnvironmentId(requestorId, environmentId)
  if (!ownerIds.includes(requestorId) && (!requestorPermission || requestorPermission.level <= 0)) {
    throw new ForbiddenError('Vous n\'avez pas de droits sur cet environnement')
  }

  if (level !== 2 && ownerIds.includes(userId)) {
    throw new ForbiddenError('La permission du owner du projet ne peut être inférieure à rwd')
  }

  const schemaValidation = PermissionSchema.omit({ id: true }).safeParse({ userId, environmentId, level })
  validateSchema(schemaValidation)

  const permission = await setPermissionQuery({ userId, environmentId, level })

  const { results } = await hook.project.upsert(project.id)
  await addLogs('Upsert Permission', results, userId, requestId)
  if (results.failed) {
    throw new UnprocessableContentError('Echec des services à l\'application de la permission')
  }
  return permission
}

export const deletePermission = async (
  userId: User['id'],
  environmentId: Environment['id'],
  requestorId: Environment['id'],
  requestId: string,
) => {
  const environment = await getEnvironmentByIdWithCluster(environmentId)
  if (!environment) throw new NotFoundError('Environnement introuvable')
  const project = await getProjectInfos(environment.projectId)
  if (!project) throw new NotFoundError('Projet introuvable')

  const ownerIds = project.roles
    .filter(({ role }) => role === 'owner')
    .map(({ userId }) => userId)

  const requestorPermission = await getPermissionByUserIdAndEnvironmentId(requestorId, environmentId)
  if (!ownerIds.includes(requestorId) && (!requestorPermission || requestorPermission.level <= 0)) {
    throw new ForbiddenError('Vous n\'avez pas de droits sur cet environnement')
  }

  if (ownerIds.includes(userId)) {
    throw new ForbiddenError(`La permission du owner du projet ne peut être ${Action.delete}`)
  }

  const { results } = await hook.project.upsert(project.id)
  await addLogs('Delete Permission', results, userId, requestId)
  if (results.failed) {
    throw new UnprocessableContentError('Echec des services à la suppression de la permission')
  }
  return deletePermissionQuery(userId, environmentId)
}
