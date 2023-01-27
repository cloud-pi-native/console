import {
  getProjectUsers,
  getProjectById,
  projectLocked,
  projectUnlocked,
  projectAddUser,
  projectRemoveUser,
} from '../models/queries/project-queries.js'
import {
  createUser,
  getUserByEmail,
  getUserById,
} from '../models/queries/user-queries.js'
import {
  getRoleByUserIdAndProjectId,
  deleteRoleByUserIdAndProjectId,
} from '../models/queries/users-projects-queries.js'
import { deletePermission } from '../models/queries/permission-queries.js'
import { getEnvironmentsByProjectId } from '../models/queries/environment-queries.js'
import { send200, send201, send500 } from '../utils/response.js'
import { getLogInfos } from '../utils/logger.js'

// GET
export const getProjectUsersController = async (req, res) => {
  const userId = req.session?.id
  const projectId = req.params?.projectId

  try {
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Requestor is not member of project')

    const users = await getProjectUsers(projectId)

    req.log.info({
      ...getLogInfos(),
      description: 'Project members successfully retreived',
    })
    await send200(res, users)
  } catch (error) {
    const message = 'Cannot retrieve members of project'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
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
//     await send200(res, users)
//   } catch (error) {
//     const message = 'Cannot retrieve users'
//     req.log.error({
//       ...getLogInfos(),
//       description: message,
//       error: error.message,
//     })
//     send500(res, message)
//   }
// }

// CREATE
export const projectAddUserController = async (req, res) => {
  const userId = req.session?.user.id
  const projectId = req.params?.id
  const data = req.body

  let project
  try {
    project = await getProjectById(projectId)

    if (!project) throw new Error('Project not found')

    const requestorRole = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!requestorRole) throw new Error('Requestor is not member of project')

    const userToAdd = await getUserByEmail(data.email)

    // TODO : refacto add et update en upsert ?
    const userToAddRole = await getRoleByUserIdAndProjectId(userToAdd.id, projectId)
    // TODO : test, si aucune valeur pour role, est-ce bien falsy ?
    console.log(userToAddRole.dataValues)
    if (userToAddRole) throw new Error('User is already member of projet')

    await projectLocked(projectId)
    await projectAddUser({ project, user: userToAdd, role: 'user' })

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
      error: error.message,
    })
    return send500(res, message)
  }

  try {
    // TODO : US #132 appel ansible
    try {
      await projectUnlocked(projectId)

      req.log.info({
        ...getLogInfos({ projectId }),
        description: 'Project status successfully updated in database',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: 'Cannot update project status',
        error: error.message,
      })
    }
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Provisioning project with ansible failed',
      error,
    })
    try {
      await projectUnlocked(projectId)

      req.log.info({
        ...getLogInfos({ projectId }),
        description: 'Project status successfully updated in database',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: 'Cannot update project status',
        error: error.message,
      })
    }
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
    req.log.error({
      ...getLogInfos(),
      description: 'Cannot create user',
      error: error.message,
    })
    return send500(res, error.message)
  }
}

// DELETE
export const projectRemoveUserController = async (req, res) => {
  const userId = req.session?.user.id
  const projectId = req.params?.projectId
  const userToRemoveId = req.params?.userId

  let project
  try {
    project = await getProjectById(projectId)
    if (!project) throw new Error('Project not found')

    const requestorRole = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!requestorRole) throw new Error('Requestor is not member of project')

    const userToRemove = await getUserById(userToRemoveId)

    const userToRemoveRole = await getRoleByUserIdAndProjectId(userToRemoveId, projectId)
    if (!userToRemoveRole) throw new Error('User to remove is not member of the project')

    await projectLocked(projectId)
    await projectRemoveUser({ project, user: userToRemove })

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
      error: error.message,
    })
    return send500(res, message)
  }

  try {
    // TODO : US #132 appel ansible
    try {
      await projectUnlocked(projectId)

      req.log.info({
        ...getLogInfos({ projectId }),
        description: 'Project status successfully updated in database',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: 'Cannot update project status',
        error: error.message,
      })
    }
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Provisioning project with ansible failed',
      error,
    })
    try {
      await projectUnlocked(projectId)

      req.log.info({
        ...getLogInfos({ projectId }),
        description: 'Project status successfully updated in database',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: 'Cannot update project status',
        error: error.message,
      })
    }
  }
}
