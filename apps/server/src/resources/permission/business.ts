import type { Environment, Permission, Project, User } from '@prisma/client'
import { PermissionSchema } from '@cpn-console/shared'
import { addLogs, deletePermission as deletePermissionQuery, getEnvironmentByIdWithCluster, getEnvironmentPermissions as getEnvironmentPermissionsQuery, getPermissionByUserIdAndEnvironmentId, getProjectInfos, getQuotaStageById, getSingleOwnerByProjectId, getStageById, getUserById, setPermission as setPermissionQuery, updatePermission as updatePermissionQuery } from '@/resources/queries-index.js'
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
  const project = await getProjectInfos(projectId)
  if (!project) throw new NotFoundError('Projet introuvable')
  const errorMessage = checkInsufficientRoleInProject(userId, { roles: project.roles })
  if (errorMessage) throw new ForbiddenError(errorMessage, undefined)
  return getEnvironmentPermissionsQuery(environmentId)
}

export const setPermission = async (
  projectId: Project['id'],
  requestorId: User['id'],
  userId: User['id'],
  environmentId: Environment['id'],
  level: Permission['level'],
  requestId: string,
) => {
  const project = await getProjectInfos(projectId)
  if (!project) throw new BadRequestError('Le projet n\'existe pas')

  const errorMessage = checkRoleAndLocked(project, requestorId)
  if (errorMessage) throw new ForbiddenError(errorMessage, undefined)

  const isUserProjectMember = project.roles?.some(role => role?.userId === userId)
  if (!isUserProjectMember) throw new BadRequestError('L\'utilisateur n\'est pas membre du projet', undefined)

  const schemaValidation = PermissionSchema.omit({ id: true }).safeParse({ userId, environmentId, level })
  validateSchema(schemaValidation)

  const permission = await setPermissionQuery({ userId, environmentId, level })
  const environment = await getEnvironmentByIdWithCluster(permission.environmentId)
  if (!environment) throw new BadRequestError('L\'environnement n\'existe pas')
  const stageId = (await getQuotaStageById(environment.quotaStageId))?.stageId
  if (!stageId) throw new BadRequestError('L\'association quota stage n\'existe pas')
  const stage = await getStageById(stageId)
  if (!stage) throw new BadRequestError('Le type d\'environnement n\'existe pas')
  const user = await getUserById(userId)
  if (!user) throw new BadRequestError('L\'utilisateur n\'existe pas')

  const { results } = await hook.project.upsert(project.id)

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
  requestId: string,
) => {
  const project = await getProjectInfos(projectId)
  if (!project) throw new BadRequestError('Le projet n\'existe pas')

  await preventUpdatingOwnerPermission(projectId, userId)

  const errorMessage = checkRoleAndLocked(project, requestorId)
  if (errorMessage) throw new ForbiddenError(errorMessage)

  const requestorPermission = await getPermissionByUserIdAndEnvironmentId(requestorId, environmentId)
  if (!requestorPermission?.length) throw new ForbiddenError('Vous n\'avez pas de droits sur cet environnement')

  const schemaValidation = PermissionSchema.omit({ id: true }).safeParse({ userId, environmentId, level })
  validateSchema(schemaValidation)

  const permission = await updatePermissionQuery({ userId, environmentId, level })
  const environment = await getEnvironmentByIdWithCluster(permission.environmentId)
  if (!environment) throw new BadRequestError('L\'environnement n\'existe pas')
  const stageId = (await getQuotaStageById(environment.quotaStageId))?.stageId
  if (!stageId) throw new BadRequestError('L\'association quota stage n\'existe pas')
  const stage = await getStageById(stageId)
  if (!stage) throw new BadRequestError('Le type d\'environnement n\'existe pas')
  const user = await getUserById(userId)
  if (!user) throw new BadRequestError('L\'utilisateur n\'existe pas')

  const { results } = await hook.project.upsert(project.id)

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
  requestId: string,
) => {
  const environment = await getEnvironmentByIdWithCluster(environmentId)
  if (!environment) throw new NotFoundError('Environnement introuvable')
  const project = await getProjectInfos(environment.projectId)
  if (!project) throw new NotFoundError('Projet introuvable')
  await preventUpdatingOwnerPermission(project.id, userId, Action.delete)
  const requestorPermission = await getPermissionByUserIdAndEnvironmentId(requestorId, environmentId)
  if (!requestorPermission?.length) throw new ForbiddenError('Vous n\'avez pas de droits sur cet environnement')
  const user = await getUserById(userId)
  if (!user) throw new NotFoundError('Utilisateur introuvable')
  const { results } = await hook.project.upsert(project.id)

  await addLogs('Delete Permission', results, userId, requestId)
  if (results.failed) {
    throw new UnprocessableContentError('Echec à la suppression de la permission')
  }
  return deletePermissionQuery(userId, environmentId)
}
