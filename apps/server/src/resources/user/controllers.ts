import { sendOk, sendCreated } from '@/utils/response.js'
import { addReqLogs } from '@/utils/logger.js'
import { addUserToProject, checkProjectLocked, checkProjectRole, getMatchingUsers, getProjectInfos, getProjectUsers, removeUserFromProject, updateUserProjectRole } from './business.js'
import { type FastifyRequestWithSession } from '@/types/index.js'
import { type RouteHandler } from 'fastify'
import type { UserParams, AddUserToProjectDto, RoleParams, LettersQuery, UpdateUserProjectRoleDto } from '@dso-console/shared'
import { adminGroupPath } from '@dso-console/shared'

// GET
// TODO : pas utilisé
export const getProjectUsersController: RouteHandler = async (req: FastifyRequestWithSession<{
  Params: UserParams
}>, res) => {
  const user = req.session?.user
  const projectId = req.params?.projectId

  const users = await getProjectUsers(projectId)
  console.log(users)

  if (!user.groups?.includes(adminGroupPath)) {
    await checkProjectRole(user.id, { userList: users, minRole: 'user' })
  }

  addReqLogs({
    req,
    description: 'Membres du projet récupérés avec succès',
    extras: {
      projectId,
    },
  })
  sendOk(res, users)
}

export const getMatchingUsersController: RouteHandler = async (req: FastifyRequestWithSession<{
  Params: UserParams
  Querystring: LettersQuery
}>, res) => {
  const user = req.session?.user
  const projectId = req.params?.projectId
  const { letters } = req.query

  const users = await getProjectUsers(projectId)

  if (!user.groups?.includes(adminGroupPath)) {
    await checkProjectRole(user.id, { userList: users, minRole: 'user' })
  }

  const usersMatching = await getMatchingUsers(letters)

  addReqLogs({
    req,
    description: 'Utilisateurs récupérés avec succès',
    extras: {
      projectId,
    },
  })
  sendOk(res, usersMatching)
}

// CREATE
export const addUserToProjectController: RouteHandler = async (req: FastifyRequestWithSession<{
  Params: UserParams
  Body: AddUserToProjectDto
}>, res) => {
  const user = req.session?.user
  const projectId = req.params?.projectId
  const data = req.body

  const project = await getProjectInfos(projectId)

  if (!user.groups?.includes(adminGroupPath)) {
    await checkProjectRole(user.id, { roles: project.roles, minRole: 'owner' })
  }

  await checkProjectLocked(project)

  const userToAdd = await addUserToProject(project, data.email, user.id)

  const description = 'Utilisateur ajouté au projet avec succès'
  addReqLogs({
    req,
    description,
    extras: {
      projectId,
      userId: userToAdd.id,
    },
  })
  sendCreated(res, description)
}

// PUT
export const updateUserProjectRoleController: RouteHandler = async (req: FastifyRequestWithSession<{
  Params: RoleParams
  Body: UpdateUserProjectRoleDto
}>, res) => {
  const user = req.session?.user
  const projectId = req.params?.projectId
  const userToUpdateId = req.params?.userId
  const data = req.body

  const project = await getProjectInfos(projectId)

  if (!user.groups?.includes(adminGroupPath)) {
    await checkProjectRole(user.id, { roles: project.roles, minRole: 'owner' })
  }

  await checkProjectLocked(project)

  await updateUserProjectRole(userToUpdateId, project, data.role)

  const description = 'Rôle de l\'utilisateur mis à jour avec succès'
  addReqLogs({
    req,
    description,
    extras: {
      projectId,
      userId: userToUpdateId,
    },
  })
  sendOk(res, description)
}

// DELETE
export const removeUserFromProjectController: RouteHandler = async (req: FastifyRequestWithSession<{
  Params: RoleParams
}>, res) => {
  const user = req.session?.user
  const projectId = req.params?.projectId
  const userToRemoveId = req.params?.userId

  const project = await getProjectInfos(projectId)

  if (!user.groups?.includes(adminGroupPath)) {
    await checkProjectRole(user.id, { roles: project.roles, minRole: 'owner' })
  }

  await checkProjectLocked(project)

  await removeUserFromProject(userToRemoveId, project, user.id)

  const description = 'Utilisateur retiré du projet avec succès'
  addReqLogs({
    req,
    description,
    extras: {
      projectId,
      userId: userToRemoveId,
    },
  })
  sendOk(res, description)
}
