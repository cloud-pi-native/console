import { getOrCreateUser, addLogs, addUserToProject as addUserToProjectQuery, createUser, deletePermission, getMatchingUsers as getMatchingUsersQuery, getProjectInfos as getProjectInfosQuery, getProjectUsers as getProjectUsersQuery, getUserByEmail, getUserById, lockProject, removeUserFromProject as removeUserFromProjectQuery, updateProjectFailed, updateUserProjectRole as updateUserProjectRoleQuery } from '@/resources/queries-index.js'
import type { User, Project } from '@prisma/client'
import { hooks } from '@/plugins/index.js'
import { type PluginResult } from '@/plugins/hooks/hook.js'
import { checkInsufficientRoleInProject } from '@/utils/controller.js'
import { unlockProjectIfNotFailed } from '@/utils/business.js'
import { BadRequestError, ForbiddenError, UnprocessableContentError } from '@/utils/errors.js'
import { type AsyncReturnType, type ProjectRoles, projectIsLockedInfo, userSchema } from '@dso-console/shared'

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

export const getProjectInfos = async (projectId: Project['id']) => getProjectInfosQuery(projectId)

export const getProjectUsers = async (projectId: Project['id']) => {
  const users = await getProjectUsersQuery(projectId)
  return users.map(({ roles, ...keys }) => ({ role: roles[0], ...keys }))
}

export const getMatchingUsers = async (letters: string) => getMatchingUsersQuery(letters)

export const addUserToProject = async (
  project: AsyncReturnType<typeof getProjectInfos>,
  email: User['email'],
  userId: User['id'],
) => {
  let userToAdd = await getUserByEmail(email)

  // Retrieve user from keycloak if does not exist in db
  if (!userToAdd) {
    const results = await hooks.retrieveUserByEmail.execute({ email })
    // @ts-ignore
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
    addLogs('Add User to Project Validation', { reasons, failed: true }, userId)
    throw new UnprocessableContentError(reasons, undefined)
  }

  await lockProject(project.id)

  try {
    await addUserToProjectQuery({ project, user: userToAdd, role: 'user' })

    const results = await hooks.addUserToProject.execute(kcData)
    // @ts-ignore
    await addLogs('Add Project Member', results, userId)

    await unlockProjectIfNotFailed(project.id)
    return userToAdd
  } catch (error) {
    await updateProjectFailed(project.id)
    throw new Error('Echec d\'ajout de l\'utilisateur au projet')
  }
}

export const updateUserProjectRole = async (
  userToUpdateId: User['id'],
  project: AsyncReturnType<typeof getProjectInfos>,
  role: ProjectRoles,
) => {
  if (project.roles.filter(projectUser => projectUser.userId === userToUpdateId).length === 0) throw new BadRequestError('L\'utilisateur ne fait pas partie du projet', undefined)

  await updateUserProjectRoleQuery(userToUpdateId, project.id, role)
}

export const removeUserFromProject = async (
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
    addLogs('Remove User from Project Validation', { reasons, failed: true }, userId)
    throw new UnprocessableContentError(reasons, undefined)
  }

  await lockProject(project.id)

  try {
    for (const environment of project.environments) {
      await deletePermission(userToRemoveId, environment.id)
    }
    await removeUserFromProjectQuery({ projectId: project.id, userId: userToRemoveId })

    const results = await hooks.removeUserFromProject.execute(kcData)
    // @ts-ignore
    await addLogs('Remove User from Project', results, userId)

    await unlockProjectIfNotFailed(project.id)
  } catch (error) {
    await updateProjectFailed(project.id)
    throw new Error('Echec de retrait de l\'utilisateur du projet')
  }
}
