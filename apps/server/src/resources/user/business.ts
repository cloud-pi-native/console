import { type KeycloakPayload } from 'fastify-keycloak-adapter'
import type { Project, User } from '@prisma/client'
import { UserSchema, instanciateSchema, projectIsLockedInfo, type AsyncReturnType, adminGroupPath } from '@cpn-console/shared'
import { addLogs, addUserToProject as addUserToProjectQuery, createUser, deletePermission, getMatchingUsers as getMatchingUsersQuery, getProjectInfos as getProjectInfosQuery, getProjectUsers as getProjectUsersQuery, getRolesByProjectId, getUserByEmail, getUserById, removeUserFromProject as removeUserFromProjectQuery, transferProjectOwnership as transferProjectOwnershipQuery, getUsers as getUsersQuery, setPermission } from '@/resources/queries-index.js'
import { validateSchema } from '@/utils/business.js'
import { checkInsufficientRoleInProject, type SearchOptions } from '@/utils/controller.js'
import { BadRequestError, ForbiddenError, NotFoundError, UnprocessableContentError } from '@/utils/errors.js'
import { hook } from '@/utils/hook-wrapper.js'
import { rolesToMembers } from '../project/business.js'

export const getUsers = async () => {
  const users = await getUsersQuery()

  const hookReply = await hook.user.retrieveAdminUsers()
  if (hookReply.failed) {
    throw new UnprocessableContentError('Echec de récupération des administrateurs')
  }

  const adminIds: string[] = hookReply.results.keycloak?.adminIds

  if (!adminIds?.length) return users.map(user => ({ ...user, isAdmin: false }))

  return users.map(user => ({ ...user, isAdmin: adminIds.includes(user.id) }))
}

export const updateUserAdminRole = async ({ userId, isAdmin }: { userId: string, isAdmin: boolean }, requestId: string) => {
  const hookReply = await hook.user.updateUserAdminGroupMembership(userId, { isAdmin })
  await addLogs('Update User Admin Role', hookReply, userId, requestId)
  if (hookReply.failed) {
    throw new UnprocessableContentError('Echec des services à la mise à jour du rôle de l\'utilisateur')
  }
}

export type UserDto = Pick<User, 'email' | 'firstName' | 'lastName' | 'id'>

export const checkProjectRole = (userId: User['id'], { userList = undefined, roles = undefined, minRole }: SearchOptions) => {
  // @ts-ignore
  const insufficientRoleErrorMessage = checkInsufficientRoleInProject(userId, { userList, minRole, roles })
  if (insufficientRoleErrorMessage) throw new ForbiddenError(insufficientRoleErrorMessage, undefined)
}

export const checkProjectLocked = (project: Project) => {
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
    const hookReply = await hook.user.retrieveUserByEmail(email)
    await addLogs('Retrieve User By Email', hookReply, userId, requestId)
    if (hookReply.failed) {
      throw new UnprocessableContentError('Echec des services à la récupération des administrateurs')
    }

    const retrievedUser = hookReply.results.keycloak?.user
    if (!retrievedUser) throw new NotFoundError('Utilisateur introuvable')

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

    const { results } = await hook.project.upsert(project.id)
    await addLogs('Add Project Member', results, userId, requestId)
    if (results.failed) {
      throw new UnprocessableContentError('Echec des services à l\'ajout de l\'utilisateur au projet')
    }

    return rolesToMembers(await getRolesByProjectId(project.id))
  } catch (error) {
    throw new Error('Echec d\'ajout de l\'utilisateur au projet')
  }
}

export const transferProjectOwnership = async (
  requestor: KeycloakPayload,
  userToUpdateId: User['id'],
  projectId: Project['id'],
) => {
  const project = await getProjectInfos(projectId)
  if (!project) throw new BadRequestError(`Le projet ayant pour id ${projectId} n'existe pas`)

  checkProjectLocked(project)

  if (!project.roles.some(projectUser => projectUser.userId === userToUpdateId)) throw new BadRequestError('L\'utilisateur ne fait pas partie du projet')

  const owner = project.roles.find(role => role.role === 'owner')
  if (!owner) throw new BadRequestError('Impossible de trouver le souscripteur actuel du projet')

  if (!requestor.groups?.includes(adminGroupPath)) {
    checkProjectRole(requestor.id, { roles: project.roles, minRole: 'owner' })
  }

  await transferProjectOwnershipQuery(projectId, userToUpdateId, owner.userId)
  await Promise.all(
    project.environments
      .map(environment => setPermission({
        userId: userToUpdateId,
        environmentId: environment.id,
        level: 2,
      })),
  )
  return rolesToMembers(await getRolesByProjectId(project.id))
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
    if (results.failed) {
      throw new UnprocessableContentError('Echec des services au retrait de l\'utilisateur au projet')
    }

    return rolesToMembers(await getRolesByProjectId(project.id))
  } catch (error) {
    throw new Error('Echec du retrait de l\'utilisateur du projet')
  }
}
