import { sendOk, sendCreated } from '@/utils/response.js'
import { addReqLogs } from '@/utils/logger.js'
import { addUserToProject, checkProjectLocked, checkProjectRole, getMatchingUsers, getProjectInfos, getProjectUsers, removeUserFromProject, updateUserProjectRole } from './business.js'

// GET
// TODO : pas utilisé
export const getProjectUsersController = async (req, res) => {
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId

  const users = await getProjectUsers(projectId)

  await checkProjectRole(userId, { userList: users, minRole: 'user' })

  addReqLogs({
    req,
    description: 'Membres du projet récupérés avec succès',
    extras: {
      projectId,
    },
  })
  sendOk(res, users)
}

export const getMatchingUsersController = async (req, res) => {
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId
  const { letters } = req.query

  const users = await getProjectUsers(projectId)

  await checkProjectRole(userId, { userList: users, minRole: 'user' })

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
export const addUserToProjectController = async (req, res) => {
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId
  const data = req.body

  const project = await getProjectInfos(projectId)

  await checkProjectRole(userId, { roles: project.roles, minRole: 'owner' })

  await checkProjectLocked(project)

  const userToAdd = await addUserToProject(project, data.email, userId)

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
export const updateUserProjectRoleController = async (req, res) => {
  const userId = req.session?.user.id
  const projectId = req.params?.projectId
  const userToUpdateId = req.params?.userId
  const data = req.body

  const project = await getProjectInfos(projectId)

  await checkProjectRole(userId, { roles: project.roles, minRole: 'owner' })

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
export const removeUserFromProjectController = async (req, res) => {
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId
  const userToRemoveId = req.params?.userId

  const project = await getProjectInfos(projectId)

  await checkProjectRole(userId, { roles: project.roles, minRole: 'owner' })

  await checkProjectLocked(project)

  await removeUserFromProject(userToRemoveId, project, userId)

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
