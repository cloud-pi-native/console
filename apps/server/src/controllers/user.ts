import {
  getProjectUsers,
  lockProject,
  addUserToProject,
  removeUserFromProject,
  getProjectInfos,
} from '../queries/project-queries.js'
import { createUser, getUserByEmail } from '../queries/user-queries.js'
import { updateUserProjectRole } from '../queries/roles-queries.js'
import { deletePermission } from '../queries/permission-queries.js'
import { sendOk, sendCreated, sendNotFound, sendBadRequest, sendForbidden } from '../utils/response.js'
import { addReqLogs } from '../utils/logger.js'
import { AsyncReturnType, hasRoleInProject, unlockProjectIfNotFailed } from '../utils/controller.js'
import { projectIsLockedInfo } from 'shared'

// GET
export const getProjectUsersController = async (req, res) => {
  const userId = req.session?.id
  const projectId = req.params?.projectId

  try {
    const users = await getProjectUsers(projectId)
    if (!hasRoleInProject(userId, { userList: users })) throw new Error('Vous n\'êtes pas souscripteur du projet')

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

  let project: AsyncReturnType<typeof getProjectInfos>
  try {
    project = await getProjectInfos(projectId)
    if (!project) throw new Error('Projet introuvable')
    if (project.locked) return sendForbidden(res, projectIsLockedInfo)

    if (!hasRoleInProject(userId, { roles: project.roles, minRole: 'owner' })) throw new Error('Vous n\'êtes pas souscripteur du projet')

    const userToAdd = await getUserByEmail(data.email)
    if (!userToAdd) throw new Error('Utilisateur introuvable')

    // si le user ne fait pas parti du projet
    if (project.roles.filter(userProject => userProject.userId === userId).length > 0) throw new Error('L\'utilisateur est déjà membre du projet')

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

  let project: AsyncReturnType<typeof getProjectInfos>
  try {
    project = await getProjectInfos(projectId)
    if (!project) throw new Error('Projet introuvable')
    if (project.locked) return sendForbidden(res, projectIsLockedInfo)

    if (!hasRoleInProject(userId, { roles: project.roles, minRole: 'owner' })) throw new Error('Vous n\'êtes pas membre du projet')

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

  let project: AsyncReturnType<typeof getProjectInfos>
  try {
    project = await getProjectInfos(projectId)
    if (!project) throw new Error('Projet introuvable')
    if (!hasRoleInProject(userId, { roles: project.roles, minRole: 'owner' })) throw new Error('Vous n\'êtes pas membre du projet')

    if (!hasRoleInProject(userToRemoveId, { roles: project.roles })) throw new Error('L\'utilisateur n\'est pas membre du projet')

    await lockProject(projectId)
    project.environments.forEach(async env => {
      // TODO : retirer user des groupes keycloak permission pour le projet
      await deletePermission(userToRemoveId, env.id)
    })
    await removeUserFromProject({ projectId: project.id, userId: userToRemoveId })

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
