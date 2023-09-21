import { getOrCreateUser, addLogs, addUserToProject, createUser, deletePermission, getMatchingUsers, getProjectInfos, getProjectUsers, getUserByEmail, getUserById, lockProject, removeUserFromProject, updateProjectFailed, updateUserProjectRole } from '@/resources/queries-index.js'
import { User, Project } from '@prisma/client'
import { hooks } from '@/plugins/index.js'
import { PluginResult } from '@/plugins/hooks/hook.js'
import { AsyncReturnType, checkInsufficientRoleInProject } from '@/utils/controller.js'
import { unlockProjectIfNotFailed } from '@/utils/business.js'
import { BadRequestError, ForbiddenError, UnprocessableContentError } from '@/utils/errors.js'
import { ProjectRoles, projectIsLockedInfo, userSchema } from '@dso-console/shared'

export type UserDto = Pick<User, 'email' | 'firstName' | 'lastName' | 'id'>
export const getUser = async (user: UserDto) => {
  await userSchema.validateAsync(user)
  return getOrCreateUser(user)
}

export const checkProjectRole = async (userId: User['id'], { userList = undefined, roles = undefined, minRole }) => {
  const insufficientRoleErrorMessage = checkInsufficientRoleInProject(userId, { userList, minRole, roles })
  if (insufficientRoleErrorMessage) throw new ForbiddenError(insufficientRoleErrorMessage, undefined)
}

export const checkProjectLocked = async (project: Project) => {
  if (project.locked) throw new ForbiddenError(projectIsLockedInfo, undefined)
}

export const getProjectInfosBusiness = async (projectId: Project['id']) => getProjectInfos(projectId)

export const getProjectUsersBusiness = async (projectId: Project['id']) => getProjectUsers(projectId)

export const getMatchingUsersBusiness = async (letters: string) => getMatchingUsers(letters)

export const addUserToProjectBusiness = async (
  project: AsyncReturnType<typeof getProjectInfos>,
  email: User['email'],
  userId: User['id'],
) => {
  let userToAdd = await getUserByEmail(email)

  // Retrieve user from keycloak if does not exist in db
  if (!userToAdd) {
    const results = await hooks.retrieveUserByEmail.execute({ email })
    await addLogs('Retrieve User By Email', results, userId)
    // @ts-ignore
    const retrievedUser = results.keycloak?.user
    if (!retrievedUser) throw new BadRequestError('Utilisateur introuvable', undefined)

    // keep only keys allowed in model
    const userFromModel = {}
    Object.keys(userSchema.describe().keys).forEach(modelKey => {
      userFromModel[modelKey] = retrievedUser[modelKey]
    })

    await userSchema.validateAsync(userFromModel)
    await createUser(retrievedUser)
    userToAdd = await getUserByEmail(email)
  }

  const insufficientRoleErrorMessageUserToAdd = checkInsufficientRoleInProject(userToAdd.id, { roles: project.roles, minRole: 'user' })
  if (!insufficientRoleErrorMessageUserToAdd) throw new BadRequestError('L\'utilisateur est déjà membre du projet', undefined)

  const kcData = {
    organization: project.organization.name,
    project: project.name,
    user: userToAdd,
  }

  const isValid = await hooks.addUserToProject.validate(kcData)
  if (isValid?.failed) {
    const reasons = Object.values(isValid)
      .filter((plugin: PluginResult) => plugin?.status?.result === 'KO')
      .map((plugin: PluginResult) => plugin.status.message)
      .join('; ')
    addLogs('Add User to Project Validation', { reasons }, userId)
    throw new UnprocessableContentError(reasons, undefined)
  }

  await lockProject(project.id)

  try {
    await addUserToProject({ project, user: userToAdd, role: 'user' })

    const results = await hooks.addUserToProject.execute(kcData)
    await addLogs('Add Project Member', results, userId)

    await unlockProjectIfNotFailed(project.id)
    return userToAdd
  } catch (error) {
    await updateProjectFailed(project.id)
    throw new Error('Echec d\'ajout de l\'utilisateur au projet')
  }
}

export const updateUserProjectRoleBusiness = async (
  userToUpdateId: User['id'],
  project: AsyncReturnType<typeof getProjectInfos>,
  role: ProjectRoles,
) => {
  if (project.roles.filter(projectUser => projectUser.userId === userToUpdateId).length === 0) throw new BadRequestError('L\'utilisateur ne fait pas partie du projet', undefined)

  await updateUserProjectRole(userToUpdateId, project.id, role)
}

export const removeUserFromProjectBusiness = async (
  userToRemoveId: User['id'],
  project: AsyncReturnType<typeof getProjectInfos>,
  userId: User['id'],
) => {
  const userToRemove = await getUserById(userToRemoveId)
  if (!userToRemove) throw new Error('L\'utilisateur n\'existe pas')

  const insufficientRoleErrorMessageUserToRemove = checkInsufficientRoleInProject(userToRemoveId, { roles: project.roles })
  if (insufficientRoleErrorMessageUserToRemove) throw new BadRequestError('L\'utilisateur n\'est pas membre du projet')

  const kcData = {
    organization: project.organization.name,
    project: project.name,
    user: userToRemove,
  }

  const isValid = await hooks.removeUserFromProject.validate(kcData)
  if (isValid?.failed) {
    const reasons = Object.values(isValid)
      .filter((plugin: PluginResult) => plugin?.status?.result === 'KO')
      .map((plugin: PluginResult) => plugin.status.message)
      .join('; ')
    addLogs('Remove User from Project Validation', { reasons }, userId)
    throw new UnprocessableContentError(reasons, undefined)
  }

  await lockProject(project.id)

  try {
    project.environments.forEach(async env => {
      await deletePermission(userToRemoveId, env.id)
    })
    await removeUserFromProject({ projectId: project.id, userId: userToRemoveId })

    const results = await hooks.removeUserFromProject.execute(kcData)
    await addLogs('Remove User from Project', results, userId)

    await unlockProjectIfNotFailed(project.id)
  } catch (error) {
    await updateProjectFailed(project.id)
    throw new Error('Echec de retrait de l\'utilisateur du projet')
  }
}
