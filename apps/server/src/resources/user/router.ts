import { userContract, adminGroupPath } from '@cpn-console/shared'
import { addReqLogs } from '@/utils/logger.js'
import {
  addUserToProject,
  checkProjectLocked,
  checkProjectRole,
  getMatchingUsers,
  getProjectInfos,
  getProjectUsers,
  removeUserFromProject,
  updateUserProjectRole,
} from './business.js'
import '@/types/index.js'
import { BadRequestError } from '@/utils/errors.js'
import { serverInstance } from '@/app.js'

export const userRouter = () => serverInstance.router(userContract, {
  getProjectUsers: async ({ request: req, params }) => {
    const user = req.session.user
    const projectId = params.projectId

    const users = await getProjectUsers(projectId)

    if (!user.groups?.includes(adminGroupPath)) {
      await checkProjectRole(user.id, { userList: users, minRole: 'user' })
    }

    addReqLogs({
      req,
      message: 'Membres du projet récupérés avec succès',
      infos: {
        projectId,
      },
    })
    return {
      status: 200,
      body: users,
    }
  },

  getMatchingUsers: async ({ request: req, params, query }) => {
    const user = req.session.user
    const projectId = params.projectId
    const { letters } = query

    const users = await getProjectUsers(projectId)

    if (!user.groups?.includes(adminGroupPath)) {
      await checkProjectRole(user.id, { userList: users, minRole: 'user' })
    }

    const usersMatching = await getMatchingUsers(letters)

    addReqLogs({
      req,
      message: 'Utilisateurs récupérés avec succès',
      infos: {
        projectId,
      },
    })
    return {
      status: 200,
      body: usersMatching,
    }
  },

  createUserRoleInProject: async ({ request: req, params, body: data }) => {
    const user = req.session.user
    const projectId = params.projectId

    const project = await getProjectInfos(projectId)
    if (!project) throw new BadRequestError(`Le projet ayant pour id ${projectId} n'existe pas`)

    if (!user.groups?.includes(adminGroupPath)) {
      await checkProjectRole(user.id, { roles: project.roles, minRole: 'owner' })
    }

    await checkProjectLocked(project)

    const newRoles = await addUserToProject(project, data.email, user.id, req.id)

    addReqLogs({
      req,
      message: 'Utilisateur ajouté au projet avec succès',
      infos: {
        projectId,
        email: data.email,
      },
    })
    return {
      status: 201,
      body: newRoles,
    }
  },

  updateUserRoleInProject: async ({ request: req, params, body: data }) => {
    const user = req.session.user
    const projectId = params.projectId
    const userToUpdateId = params.userId

    const project = await getProjectInfos(projectId)
    if (!project) throw new BadRequestError(`Le projet ayant pour id ${projectId} n'existe pas`)

    if (!user.groups?.includes(adminGroupPath)) {
      await checkProjectRole(user.id, { roles: project.roles, minRole: 'owner' })
    }

    await checkProjectLocked(project)

    const newRoles = await updateUserProjectRole(userToUpdateId, project, data.role)

    addReqLogs({
      req,
      message: 'Rôle de l\'utilisateur mis à jour avec succès',
      infos: {
        projectId,
        userId: userToUpdateId,
      },
    })
    return {
      status: 200,
      body: newRoles,
    }
  },

  deleteUserRoleInProject: async ({ request: req, params }) => {
    const user = req.session.user
    const projectId = params.projectId
    const userToRemoveId = params.userId

    const project = await getProjectInfos(projectId)
    if (!project) throw new BadRequestError(`Le projet ayant pour id ${projectId} n'existe pas`)

    if (!user.groups?.includes(adminGroupPath)) {
      await checkProjectRole(user.id, { roles: project.roles, minRole: 'owner' })
    }

    await checkProjectLocked(project)

    const newRoles = await removeUserFromProject(userToRemoveId, project, user.id, req.id)

    addReqLogs({
      req,
      message: 'Utilisateur retiré du projet avec succès',
      infos: {
        projectId,
        userId: userToRemoveId,
      },
    })
    return {
      status: 200,
      body: newRoles,
    }
  },
})
