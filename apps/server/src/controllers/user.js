import {
  getProjectUsers,
  getProjectById,
  lockProject,
  unlockProject,
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
import { addLogs } from '../models/queries/log-queries.js'
import { send200, send201, send500 } from '../utils/response.js'
import { getLogInfos } from '../utils/logger.js'

// GET
export const getProjectUsersController = async (req, res) => {
  const userId = req.session?.id
  const projectId = req.params?.projectId

  try {
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')

    const users = await getProjectUsers(projectId)

    req.log.info({
      ...getLogInfos(),
      description: 'Project members successfully retreived',
    })
    send200(res, users)
  } catch (error) {
    const message = `Echec de récupération des membres du projet: ${error.message}`
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
      trace: error.trace,
    })
    send500(res, message)
  }
}

// TODO : conditionner possibilité de récupérer tous les utilisateurs selon les droits de l'utilisateur
// export const getUsersController = async (req, res) => {
//   try {
//     const users = await getUsers()
//     req.log.info({
//       ...getLogInfos(),
//       description: 'Users successfully retreived',
//     })
//     send200(res, users)
//   } catch (error) {
//     const message = 'Utilisateurs non trouvés'
//     req.log.error({
//       ...getLogInfos(),
//       description: message,
//       error: error.message,
//       trace: error.trace,
//     })
//     send500(res, message)
//   }
// }

// CREATE
export const addUserToProjectController = async (req, res) => {
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId
  const data = req.body

  const getCanelProject = req.getCanelProject.execute
  const updateCanelProject = req.updateCanelProject.execute
  let project
  let userToAdd
  try {
    project = await getProjectById(projectId)
    if (!project) throw new Error('Projet introuvable')

    const requestorRole = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!requestorRole) throw new Error('Vous n\'êtes pas membre du projet')

    userToAdd = await getUserByEmail(data.email)
    if (!userToAdd) throw new Error('Utilisateur introuvable')

    const userToAddRole = await getRoleByUserIdAndProjectId(userToAdd.id, projectId)
    if (userToAddRole) throw new Error('L\'utilisateur est déjà membre du projet')

    await lockProject(projectId)
    await addUserToProject({ project, user: userToAdd, role: 'user' })

    const message = 'User successfully added into project'
    req.log.info({
      ...getLogInfos({ projectId }),
      description: message,
    })
    send201(res, message)
  } catch (error) {
    const message = `Cannot add user into project: ${error.message}`
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
      trace: error.trace,
    })
    return send500(res, message)
  }

  // TODO : US #132 appel ansible
  try {
    // TODO : en attente déploiement canel

    const canelDataToUpdate = await getCanelProject(project.id)
    if (!canelDataToUpdate) throw new Error('Echec de récupération du project côté canel')

    const canelJson0 = await canelDataToUpdate.json()
    if (canelJson0.code !== 200) throw new Error(`Echec de récupération du projet côté canel : ${canelJson0.description}`)

    const newActeurs = [...canelJson0.results.acteurs, userToAdd.dataValues]

    console.log(newActeurs)

    const canelData = {
      applications: {
        uuid: project.id,
        canel_id: project.id,
        acteurs: newActeurs,
      },
    }

    console.log(canelData.applications)

    const canelRes = await updateCanelProject(canelData)
    console.log({ canelRes })
    await addLogs(canelRes, userId)

    const canelJson = await canelRes.json()

    console.log({ canelJson })

    if (canelJson.code !== 200) throw new Error(`Echec de maj du projet côté canel : ${canelJson.description}`)
    await unlockProject(projectId)

    req.log.info({
      ...getLogInfos({ projectId }),
      description: 'Project status successfully updated in database',
    })
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Cannot update project status',
      error: error.message,
      trace: error.trace,
    })
  }
}

export const createUserController = async (req, res) => {
  const data = req.body

  try {
    const user = await createUser(data)
    req.log.info({
      ...getLogInfos({
        userId: user.id,
      }),
      description: 'User successfully created in database',
    })
    send201(res, user)
  } catch (error) {
    const message = 'Utilisateur non créé'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
      trace: error.trace,
    })
    send500(res, message)
  }
}

// PUT
export const updateUserProjectRoleController = async (req, res) => {
  const userId = req.session?.user.id
  const projectId = req.params?.projectId
  const userToUpdateId = req.params?.userId
  const data = req.body

  const getCanelProject = req.getCanelProject.execute
  const updateCanelProject = req.updateCanelProject.execute
  let project
  try {
    project = await getProjectById(projectId)
    if (!project) throw new Error('Projet introuvable')

    const requestorRole = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!requestorRole) throw new Error('Vous n\'êtes pas membre du projet')

    const userToUpdateRole = await getRoleByUserIdAndProjectId(userToUpdateId, projectId)
    if (!userToUpdateRole) throw new Error('L\'utilisateur ne fait pas partie du projet')

    await updateUserProjectRole(projectId, userToUpdateId, data.role)

    const message = 'User role into project successfully updated'

    // TODO : en attente déploiement canel

    const canelDataToUpdate = await getCanelProject(project.id)
    if (!canelDataToUpdate) throw new Error('Echec de récupération du project côté canel')

    const canelJson0 = await canelDataToUpdate.json()
    if (canelJson0.code !== 200) throw new Error(`Echec de récupération du projet côté canel : ${canelJson0.description}`)

    const newActeurs = canelJson0.results.acteurs.splice(
      canelJson0.results.acteurs.findIndex(acteur => acteur.uuid === userToUpdateId),
      1,
      {
        uuid: userToUpdateId,
        role: data.role,
      },
    )

    console.log(newActeurs)

    const canelData = {
      applications: {
        uuid: project.id,
        canel_id: project.id,
        acteurs: newActeurs,
      },
    }

    console.log(canelData.applications)

    const canelRes = await updateCanelProject(canelData)
    console.log({ canelRes })
    await addLogs(canelRes, userId)

    const canelJson = await canelRes.json()
    console.log({ canelJson })

    if (canelJson.code !== 200) throw new Error(`Echec de maj du projet côté canel : ${canelJson.description}`)
    req.log.info({
      ...getLogInfos({ userToUpdateRole }),
      description: message,
    })
    send200(res, message)
  } catch (error) {
    const message = `Cannot update user role into project: ${error.message}`
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
      trace: error.trace,
    })
    send500(res, message)
  }
}

// DELETE
export const removeUserFromProjectController = async (req, res) => {
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId
  const userToRemoveId = req.params?.userId

  const getCanelProject = req.getCanelProject.execute
  const updateCanelProject = req.updateCanelProject.execute
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

    const message = 'User successfully removed from project'
    req.log.info({
      ...getLogInfos({ projectId }),
      description: message,
    })
    send200(res, message)
  } catch (error) {
    const message = `Cannot remove user from project: ${error.message}`
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
      trace: error.trace,
    })
    return send500(res, message)
  }

  // TODO : US #132 appel ansible
  try {
    // TODO : en attente déploiement canel

    const canelDataToUpdate = await getCanelProject(project.id)
    if (!canelDataToUpdate) throw new Error('Echec de récupération du project côté canel')

    const canelJson0 = await canelDataToUpdate.json()
    if (canelJson0.code !== 200) throw new Error(`Echec de récupération du projet côté canel : ${canelJson0.description}`)

    const newActeurs = canelJson0.results.acteurs.splice(
      canelJson0.results.acteurs.findIndex(acteur => acteur.uuid === userToRemoveId),
      1,
    )

    console.log(newActeurs)

    const canelData = {
      applications: {
        uuid: project.id,
        canel_id: project.id,
        acteurs: newActeurs,
      },
    }

    console.log(canelData.applications)

    const canelRes = await updateCanelProject(canelData)
    console.log({ canelRes })
    await addLogs(canelRes, userId)

    const canelJson = await canelRes.json()
    console.log({ canelJson })

    if (canelJson.code !== 200) throw new Error(`Echec de maj du projet côté canel : ${canelJson.description}`)
    await unlockProject(projectId)

    req.log.info({
      ...getLogInfos({ projectId }),
      description: 'Project status successfully updated in database',
    })
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Cannot update project status',
      error: error.message,
      trace: error.trace,
    })
  }
}
