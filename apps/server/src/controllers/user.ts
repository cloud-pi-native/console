import {
  getProjectUsers,
  getProjectById,
  lockProject,
  addUserToProject,
  removeUserFromProject,
} from '../models/queries/project-queries.js'
import {
  createUser,
  getUserByEmail,
  getUserById,
} from '../models/queries/user-queries.js'
import {
  getRoleByUserIdAndProjectId,
  deleteRoleByUserIdAndProjectId,
  updateUserProjectRole,
} from '../models/queries/users-projects-queries.js'
import { deletePermission } from '../models/queries/permission-queries.js'
import { getEnvironmentsByProjectId } from '../models/queries/environment-queries.js'
import { sendOk, sendCreated, sendNotFound, sendBadRequest, sendForbidden } from '../utils/response.js'
import { addReqLogs } from '../utils/logger.js'
import { unlockProjectIfNotFailed } from '../utils/controller.js'
import { projectIsLockedInfo } from 'shared'

// GET
export const getProjectUsersController = async (req, res) => {
  const userId = req.session?.id
  const projectId = req.params?.projectId

  try {
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')

    const users = await getProjectUsers(projectId)

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

// CREATE
export const addUserToProjectController = async (req, res) => {
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId
  const data = req.body

  let project
  try {
    project = await getProjectById(projectId)
    if (!project) throw new Error('Projet introuvable')
    if (project.locked) return sendForbidden(res, projectIsLockedInfo)

    const requestorRole = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!requestorRole) throw new Error('Vous n\'êtes pas membre du projet')

    const userToAdd = await getUserByEmail(data.email)
    if (!userToAdd) throw new Error('Utilisateur introuvable')

    const userToAddRole = await getRoleByUserIdAndProjectId(userToAdd.id, projectId)
    if (userToAddRole) throw new Error('L\'utilisateur est déjà membre du projet')

    await lockProject(projectId)
    await addUserToProject({ project, user: userToAdd, role: 'user' })

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

  // Process api call to external service
  // TODO #132
  try {
    await unlockProjectIfNotFailed(projectId)

    addReqLogs({
      req,
      description: 'Projet déverrouillé avec succès après l\'ajout de l\'utilisateur au projet',
      extras: {
        projectId,
      },
    })
  } catch (error) {
    addReqLogs({
      req,
      description: 'Echec du déverrouillage du projet après l\'ajout de l\'utilisateur au projet',
      extras: {
        projectId,
      },
      error,
    })
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

  let project
  try {
    project = await getProjectById(projectId)
    if (!project) throw new Error('Projet introuvable')
    if (project.locked) return sendForbidden(res, projectIsLockedInfo)

    const requestorRole = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!requestorRole) throw new Error('Vous n\'êtes pas membre du projet')

    const userToUpdateRole = await getRoleByUserIdAndProjectId(userToUpdateId, projectId)
    if (!userToUpdateRole) throw new Error('L\'utilisateur ne fait pas partie du projet')

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

  let project
  try {
    project = await getProjectById(projectId)
    if (!project) throw new Error('Projet introuvable')

    const requestorRole = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!requestorRole) throw new Error('Vous n\'êtes pas membre du projet')

    const userToRemove = await getUserById(userToRemoveId)

    const userToRemoveRole = await getRoleByUserIdAndProjectId(userToRemoveId, projectId)
    if (!userToRemoveRole) throw new Error('L\'utilisateur n\'est pas membre du projet')

    await lockProject(projectId)
    await removeUserFromProject({ project, user: userToRemove })

    const environments = await getEnvironmentsByProjectId(projectId)
    environments.forEach(async env => {
      // TODO : retirer user des groupes keycloak permission pour le projet
      await deletePermission(userToRemoveId, env.id)
    })
    await deleteRoleByUserIdAndProjectId(userToRemoveId, projectId)

    const description = 'Utilisateur supprimé dans le projet avec succès'
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
    const description = 'Echec de la suppression de l\'utilisateur dans le projet'
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

  // Process api call to external service
  // TODO #132
  try {
    await unlockProjectIfNotFailed(projectId)

    addReqLogs({
      req,
      description: 'Projet déverrouillé avec succès après suppression de l\'utilisateur dans le projet',
      extras: {
        projectId,
        userId: userToRemoveId,
      },
    })
  } catch (error) {
    addReqLogs({
      req,
      description: 'Echec du déverrouillage du projet après suppression de l\'utilisateur dans le projet',
      extras: {
        projectId,
        userId: userToRemoveId,
      },
      error,
    })
  }
}
