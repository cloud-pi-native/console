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
  transferProjectOwnership as transferProjectOwnershipBusiness,
  getUsers,
  updateUserAdminRole as updateUserAdminRoleBusiness,
} from './business.js'
import '@/types/index.js'
import { BadRequestError } from '@/utils/errors.js'
import { serverInstance } from '@/app.js'
import { getOrCreateUser } from './queries.js'
import { assertIsAdmin, hasGroupAdmin } from '@/utils/controller.js'

export const userRouter = () => serverInstance.router(userContract, {
  getProjectUsers: async ({ request: req, params }) => {
    const user = req.session.user
    const projectId = params.projectId

    const users = await getProjectUsers(projectId)

    if (!user.groups?.includes(adminGroupPath)) {
      checkProjectRole(user.id, { userList: users, minRole: 'user' })
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

    if (!hasGroupAdmin(user.groups)) {
      checkProjectRole(user.id, { userList: users, minRole: 'user' })
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

    checkProjectLocked(project)

    if (!hasGroupAdmin(user.groups)) {
      checkProjectRole(user.id, { roles: project.roles, minRole: 'owner' })
    }

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

  transferProjectOwnership: async ({ request: req, params }) => {
    const requestor = req.session.user
    const userToUpdateId = params.userId
    const projectId = params.projectId

    const newRoles = await transferProjectOwnershipBusiness(requestor, userToUpdateId, projectId)

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

    if (!hasGroupAdmin(user.groups) && user.id !== userToRemoveId) {
      checkProjectRole(user.id, { roles: project.roles, minRole: 'owner' })
    }

    checkProjectLocked(project)

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

  auth: async ({ request }) => {
    const { groups: _g, ...requestor } = request.session.user
    await getOrCreateUser(requestor)
    return {
      status: 200,
      body: null,
    }
  },

  getAllUsers: async ({ request: req }) => {
    assertIsAdmin(req.session.user)
    const users = await getUsers()

    addReqLogs({
      req,
      message: 'Ensemble des utilisateurs récupérés avec succès',
    })
    return {
      status: 200,
      body: users,
    }
  },

  updateUserAdminRole: async ({ request: req, params, body }) => {
    const userId = params.userId
    const isAdmin = body.isAdmin

    assertIsAdmin(req.session.user)
    await updateUserAdminRoleBusiness({ userId, isAdmin }, req.id)

    addReqLogs({
      req,
      message: 'Rôle administrateur de l\'utilisateur mis à jour avec succès',
    })
    return {
      status: 204,
      body: null,
    }
  },
})
