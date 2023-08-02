import {
  getProjectUsers,
  lockProject,
  addUserToProject,
  removeUserFromProject,
  getProjectInfos,
  updateProjectFailed,
} from '../queries/project-queries.js'
import { createUser, getUserByEmail, getMatchingUsers, getUserById } from '../queries/user-queries.js'
import { updateUserProjectRole } from '../queries/roles-queries.js'
import { deletePermission } from '../queries/permission-queries.js'
import { sendOk, sendCreated, sendNotFound, sendBadRequest, sendForbidden, sendUnprocessableContent } from '../utils/response.js'
import { addReqLogs } from '../utils/logger.js'
import { AsyncReturnType, checkInsufficientRoleInProject, unlockProjectIfNotFailed } from '../utils/controller.js'
import { projectIsLockedInfo } from 'shared'
import { addLogs } from '@/queries/log-queries.js'
import { hooks } from '@/plugins/index.js'
import { PluginResult } from '@/plugins/hooks/hook.js'

// GET
export const getProjectUsersController = async (req, res) => {
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId

  try {
    const users = await getProjectUsers(projectId)
    const insufficientRoleErrorMessage = checkInsufficientRoleInProject(userId, { userList: users })
    if (insufficientRoleErrorMessage) throw new Error(insufficientRoleErrorMessage)

    addReqLogs({
      req,
      description: 'Membres du projet récupérés avec succès',
      extras: {
        projectId,
      },
    })
    sendOk(res, users)
  } catch (error) {
    const description = 'Echec de la récupération des membres du projet'
    addReqLogs({
      req,
      description,
      extras: {
        projectId,
      },
      error,
    })
    sendNotFound(res, description)
  }
}

export const getMatchingUsersController = async (req, res) => {
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId
  const { letters } = req.query

  try {
    const project = await getProjectInfos(projectId)
    const insufficientRoleErrorMessage = checkInsufficientRoleInProject(userId, { roles: project.roles })
    if (insufficientRoleErrorMessage) throw new Error(insufficientRoleErrorMessage)

    const usersMatching = await getMatchingUsers(letters)

    addReqLogs({
      req,
      description: 'Utilisateurs récupérés avec succès',
      extras: {
        projectId,
      },
    })
    sendOk(res, usersMatching)
  } catch (error) {
    const description = 'Echec de la récupération des utilisateurs'
    addReqLogs({
      req,
      description,
      extras: {
        projectId,
      },
      error,
    })
    sendNotFound(res, description)
  }
}

// CREATE
export const addUserToProjectController = async (req, res) => {
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId
  const data = req.body

  try {
    const project = await getProjectInfos(projectId)
    if (!project) return sendBadRequest(res, 'Projet introuvable')
    if (project.locked) return sendForbidden(res, projectIsLockedInfo)

    const insufficientRoleErrorMessageRequestor = checkInsufficientRoleInProject(userId, { roles: project.roles, minRole: 'owner' })
    if (insufficientRoleErrorMessageRequestor) return sendBadRequest(res, insufficientRoleErrorMessageRequestor)

    const userToAdd = await getUserByEmail(data.email)
    if (!userToAdd) return sendBadRequest(res, 'Utilisateur introuvable')

    const insufficientRoleErrorMessageUserToAdd = checkInsufficientRoleInProject(userToAdd.id, { roles: project.roles, minRole: 'user' })
    if (!insufficientRoleErrorMessageUserToAdd) return sendBadRequest(res, 'L\'utilisateur est déjà membre du projet')

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
      sendUnprocessableContent(res, reasons)

      const description = 'Echec de la validation des prérequis de l\'ajout d\'un membre du projet par les services externes'
      addReqLogs({
        req,
        description,
        extras: {
          reasons,
        },
        error: new Error(description),
      })
      addLogs('Add Project Member Validation', { reasons }, userToAdd.id)
      return
    }

    await lockProject(projectId)
    await addUserToProject({ project, user: userToAdd, role: 'user' })

    const results = await hooks.addUserToProject.execute(kcData)
    await addLogs('Add Project Member', results, userId)

    await unlockProjectIfNotFailed(projectId)

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
  } catch (error) {
    await updateProjectFailed(projectId)
    const description = 'Echec de l\'ajout de l\'utilisateur au projet'
    addReqLogs({
      req,
      description,
      extras: {
        projectId,
      },
      error,
    })
    return sendBadRequest(res, description)
  }
}

export const createUserController = async (req, res) => {
  const data = req.body

  try {
    const user = await createUser(data)

    addReqLogs({
      req,
      description: 'Utilisateur créé avec succès',
      extras: {
        userId: user.id,
      },
    })
    sendCreated(res, user)
  } catch (error) {
    const description = 'Echec de la création de l\'utilisateur'
    addReqLogs({
      req,
      description,
      error,
    })
    sendBadRequest(res, description)
  }
}

// PUT
export const updateUserProjectRoleController = async (req, res) => {
  const userId = req.session?.user.id
  const projectId = req.params?.projectId
  const userToUpdateId = req.params?.userId
  const data = req.body

  let project: AsyncReturnType<typeof getProjectInfos>
  try {
    project = await getProjectInfos(projectId)
    if (!project) throw new Error('Projet introuvable')
    if (project.locked) return sendForbidden(res, projectIsLockedInfo)

    const insufficientRoleErrorMessage = checkInsufficientRoleInProject(userId, { roles: project.roles, minRole: 'owner' })
    if (insufficientRoleErrorMessage) throw new Error(insufficientRoleErrorMessage)

    if (project.roles.filter(userProject => userProject.userId === userId).length === 0) throw new Error('L\'utilisateur ne fait pas partie du projet')

    await updateUserProjectRole(projectId, userToUpdateId, data.role)

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
  } catch (error) {
    const description = 'Echec de la mise à jour du rôle de l\'utilisateur'
    addReqLogs({
      req,
      description,
      extras: {
        projectId,
        userId: userToUpdateId,
      },
      error,
    })
    sendBadRequest(res, description)
  }
}

// DELETE
export const removeUserFromProjectController = async (req, res) => {
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId
  const userToRemoveId = req.params?.userId

  try {
    const project = await getProjectInfos(projectId)
    if (!project) throw new Error('Projet introuvable')

    const userToRemove = await getUserById(userToRemoveId)
    if (!userToRemove) throw new Error('L\'utilisateur n\'existe pas')

    const insufficientRoleErrorMessageRequestor = checkInsufficientRoleInProject(userId, { roles: project.roles, minRole: 'owner' })
    if (insufficientRoleErrorMessageRequestor) throw new Error(insufficientRoleErrorMessageRequestor)

    const insufficientRoleErrorMessageUserToRemove = checkInsufficientRoleInProject(userToRemoveId, { roles: project.roles })
    if (insufficientRoleErrorMessageUserToRemove) throw new Error('L\'utilisateur n\'est pas membre du projet')

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
      sendUnprocessableContent(res, reasons)

      const description = 'Echec de la validation des prérequis de retrait du membre du projet par les services externes'
      addReqLogs({
        req,
        description,
        extras: {
          reasons,
        },
        error: new Error(description),
      })
      addLogs('Remove User from Project Validation', { reasons }, userToRemoveId)
      return
    }

    await lockProject(projectId)
    project.environments.forEach(async env => {
      await deletePermission(userToRemoveId, env.id)
    })
    await removeUserFromProject({ projectId: project.id, userId: userToRemoveId })

    const results = await hooks.removeUserFromProject.execute(kcData)
    await addLogs('Remove User from Project', results, userId)

    await unlockProjectIfNotFailed(projectId)

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
  } catch (error) {
    await updateProjectFailed(projectId)
    const description = 'Echec du retrait du membre du projet'
    addReqLogs({
      req,
      description,
      extras: {
        projectId,
        userId: userToRemoveId,
      },
      error,
    })
    return sendForbidden(res, description)
  }
}
