import type { Project, User } from '@prisma/client'
import { ProjectRoles, UserSchema, instanciateSchema, projectIsLockedInfo, type AsyncReturnType } from '@cpn-console/shared'
import { addLogs, addUserToProject as addUserToProjectQuery, createUser, deletePermission, getMatchingUsers as getMatchingUsersQuery, getOrCreateUser, getProjectInfos as getProjectInfosQuery, getProjectUsers as getProjectUsersQuery, getRolesByProjectId, getUserByEmail, getUserById, removeUserFromProject as removeUserFromProjectQuery, updateUserProjectRole as updateUserProjectRoleQuery } from '@/resources/queries-index.js'
import { validateSchema } from '@/utils/business.js'
import { checkInsufficientRoleInProject, type SearchOptions } from '@/utils/controller.js'
import { BadRequestError, ForbiddenError, NotFoundError } from '@/utils/errors.js'
import { hook } from '@/utils/hook-wrapper.js'

export type UserDto = Pick<User, 'email' | 'firstName' | 'lastName' | 'id'>
export const getUser = async (user: UserDto) => {
  const userToUpsert = UserSchema.omit({ groups: true }).parse(user)
  return getOrCreateUser(userToUpsert)
}

export const checkProjectRole = async (userId: User['id'], { userList = undefined, roles = undefined, minRole }: SearchOptions) => {
  // @ts-ignore
  const insufficientRoleErrorMessage = checkInsufficientRoleInProject(userId, { userList, minRole, roles })
  if (insufficientRoleErrorMessage) throw new ForbiddenError(insufficientRoleErrorMessage, undefined)
}

export const checkProjectLocked = async (project: Project) => {
  if (project.locked) throw new ForbiddenError(projectIsLockedInfo, undefined)
}

export const getProjectInfos = async (projectId: Project['id']) => getProjectInfosQuery(projectId)

export const getProjectUsers = async (projectId: Project['id']) => getProjectUsersQuery(projectId)

export const getMatchingUsers = async (letters: string) => getMatchingUsersQuery(letters)

export const addUserToProject = async (
  project: AsyncReturnType<typeof getProjectInfos>,
  email: User['email'],
  userId: User['id'],
  requestId: string,
) => {
  if (!project) throw new BadRequestError('Le projet n\'existe pas')

  let userToAdd = await getUserByEmail(email)

  // Retrieve user from keycloak if does not exist in db
  if (!userToAdd) {
    const results = await hook.user.retrieveUserByEmail(email)

    await addLogs('Retrieve User By Email', results, userId, requestId)

    const retrievedUser = results.results.keycloak?.user
    if (!retrievedUser) throw new NotFoundError('Utilisateur introuvable', undefined)

    // keep only keys allowed in model
    const userFromModel = instanciateSchema(UserSchema, undefined)
    Object.keys(userFromModel).forEach(modelKey => {
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

  try {
    await addUserToProjectQuery({ project, user: userToAdd, role: 'user' })

    const results = await hook.project.upsert(project.id)
    await addLogs('Add Project Member', results, userId, requestId)

    return getRolesByProjectId(project.id)
  } catch (error) {
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
  requestId: string,
) => {
  if (!project) throw new BadRequestError('Le projet n\'existe pas')

  const userToRemove = await getUserById(userToRemoveId)
  if (!userToRemove) throw new Error('L\'utilisateur n\'existe pas')

  const insufficientRoleErrorMessageUserToRemove = checkInsufficientRoleInProject(userToRemoveId, { roles: project.roles })
  if (insufficientRoleErrorMessageUserToRemove) throw new BadRequestError('L\'utilisateur n\'est pas membre du projet')

  try {
    for (const environment of project.environments) {
      await deletePermission(userToRemoveId, environment.id)
    }
    await removeUserFromProjectQuery({ projectId: project.id, userId: userToRemoveId })

    const { results } = await hook.project.upsert(project.id)
    await addLogs('Remove User from Project', results, userId, requestId)

    return getRolesByProjectId(project.id)
  } catch (error) {
    throw new Error('Echec de retrait de l\'utilisateur du projet')
  }
}
