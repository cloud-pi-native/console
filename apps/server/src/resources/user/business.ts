import { getOrCreateUser, addLogs, addUserToProject as addUserToProjectQuery, createUser, deletePermission, getMatchingUsers as getMatchingUsersQuery, getProjectInfos as getProjectInfosQuery, getProjectUsers as getProjectUsersQuery, getUserByEmail, getUserById, lockProject, removeUserFromProject as removeUserFromProjectQuery, updateUserProjectRole as updateUserProjectRoleQuery, getRolesByProjectId } from '@/resources/queries-index.js'
import type { User, Project, Log } from '@prisma/client'
import { hooks, type PluginResult } from '@cpn-console/hooks'
import { checkInsufficientRoleInProject } from '@/utils/controller.js'
import { unlockProjectIfNotFailed, validateSchema } from '@/utils/business.js'
import { BadRequestError, ForbiddenError } from '@/utils/errors.js'
import { type AsyncReturnType, type ProjectRoles, projectIsLockedInfo, UserSchema } from '@cpn-console/shared'

export type UserDto = Pick<User, 'email' | 'firstName' | 'lastName' | 'id'>
export const getUser = async (user: UserDto) => {
  const schemaValidation = UserSchema.safeParse(user)
  validateSchema(schemaValidation)
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
  try {
    return getProjectUsersQuery(projectId)
  } catch (error) {
    throw new BadRequestError(`Le projet ayant pour id ${projectId} n'existe pas`)
  }
}

export const getMatchingUsers = async (letters: string) => getMatchingUsersQuery(letters)

export const addUserToProject = async (
  project: AsyncReturnType<typeof getProjectInfos>,
  email: User['email'],
  userId: User['id'],
  requestId: Log['requestId'],
) => {
  if (!project) throw new BadRequestError('Le projet n\'existe pas')

  let userToAdd = await getUserByEmail(email)

  // Retrieve user from keycloak if does not exist in db
  if (!userToAdd) {
    const results = await hooks.retrieveUserByEmail.execute({ email })
    // @ts-ignore
    await addLogs('Retrieve User By Email', results, userId, requestId)
    // @ts-ignore
    const retrievedUser = results.keycloak?.user
    if (!retrievedUser) throw new BadRequestError('Utilisateur introuvable', undefined)

    // keep only keys allowed in model
    const userFromModel = {}
    Object.keys(UserSchema._type).forEach(modelKey => {
      userFromModel[modelKey] = retrievedUser[modelKey]
    })

    const schemaValidation = UserSchema.safeParse(userFromModel)
    validateSchema(schemaValidation)
    await createUser(retrievedUser)
    userToAdd = await getUserByEmail(email)
    if (!userToAdd) throw new BadRequestError('L\'utilisateur n\'existe pas')
  }

  const insufficientRoleErrorMessageUserToAdd = checkInsufficientRoleInProject(userToAdd.id, { roles: project.roles, minRole: 'user' })
  if (!insufficientRoleErrorMessageUserToAdd) throw new BadRequestError('L\'utilisateur est déjà membre du projet', undefined)

  const kcData = {
    organization: project.organization.name,
    project: project.name,
    user: userToAdd,
  }

  const pluginsResults = await hooks.addUserToProject.validate(kcData)
  if (pluginsResults?.failed) {
    const reasons = Object.values(pluginsResults.results)
      .filter((plugin: PluginResult) => plugin?.status?.result === 'KO')
      .map((plugin: PluginResult) => plugin.status.message)
      .join('; ')

    // @ts-ignore
    await addLogs('Add User to Project Validation', pluginsResults, userId, requestId)

    const message = 'Echec de la validation des prérequis par les services externes'
    throw new BadRequestError(message, { description: reasons })
  }

  await lockProject(project.id)

  try {
    await addUserToProjectQuery({ project, user: userToAdd, role: 'user' })

    const results = await hooks.addUserToProject.execute(kcData)
    // @ts-ignore
    await addLogs('Add Project Member', results, userId, requestId)

    await unlockProjectIfNotFailed(project.id)
    return getRolesByProjectId(project.id)
  } catch (error) {
    await unlockProjectIfNotFailed(project.id)
    throw new Error('Echec d\'ajout de l\'utilisateur au projet')
  }
}

export const updateUserProjectRole = async (
  userToUpdateId: User['id'],
  project: AsyncReturnType<typeof getProjectInfos>,
  role: ProjectRoles,
) => {
  if (!project) throw new BadRequestError('Le projet n\'existe pas')

  if (project.roles.filter(projectUser => projectUser.userId === userToUpdateId).length === 0) throw new BadRequestError('L\'utilisateur ne fait pas partie du projet', undefined)

  await updateUserProjectRoleQuery(userToUpdateId, project.id, role)
  return getRolesByProjectId(project.id)
}

export const removeUserFromProject = async (
  userToRemoveId: User['id'],
  project: AsyncReturnType<typeof getProjectInfos>,
  userId: User['id'],
  requestId: Log['requestId'],
) => {
  if (!project) throw new BadRequestError('Le projet n\'existe pas')

  const userToRemove = await getUserById(userToRemoveId)
  if (!userToRemove) throw new Error('L\'utilisateur n\'existe pas')

  const insufficientRoleErrorMessageUserToRemove = checkInsufficientRoleInProject(userToRemoveId, { roles: project.roles })
  if (insufficientRoleErrorMessageUserToRemove) throw new BadRequestError('L\'utilisateur n\'est pas membre du projet')

  const kcData = {
    organization: project.organization.name,
    project: project.name,
    user: userToRemove,
  }

  const pluginsResults = await hooks.removeUserFromProject.validate(kcData)
  if (pluginsResults?.failed) {
    const reasons = Object.values(pluginsResults.results)
      .filter((plugin: PluginResult) => plugin?.status?.result === 'KO')
      .map((plugin: PluginResult) => plugin.status.message)
      .join('; ')

    // @ts-ignore
    await addLogs('Remove User from Project Validation', pluginsResults, userId, requestId)

    const message = 'Echec de la validation des prérequis par les services externes'
    throw new BadRequestError(message, { description: reasons })
  }

  await lockProject(project.id)

  try {
    for (const environment of project.environments) {
      await deletePermission(userToRemoveId, environment.id)
    }
    await removeUserFromProjectQuery({ projectId: project.id, userId: userToRemoveId })

    const results = await hooks.removeUserFromProject.execute(kcData)
    // @ts-ignore
    await addLogs('Remove User from Project', results, userId, requestId)

    await unlockProjectIfNotFailed(project.id)
    return getRolesByProjectId(project.id)
  } catch (error) {
    await unlockProjectIfNotFailed(project.id)
    throw new Error('Echec de retrait de l\'utilisateur du projet')
  }
}
