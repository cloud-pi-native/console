import type { FastifyInstance } from 'fastify'
import { sendOk, sendCreated } from '@/utils/response.js'
import { addReqLogs } from '@/utils/logger.js'
import { addUserToProject, checkProjectLocked, checkProjectRole, getMatchingUsers, getProjectInfos, getProjectUsers, getSpecificUsers, removeUserFromProject, updateUserProjectRole } from './business.js'
import { adminGroupPath, addUserToProjectSchema, getMatchingUsersSchema, getProjectUsersSchema, removeUserFromProjectSchema, updateUserProjectRoleSchema, getSpecificUsersSchema } from '@dso-console/shared'

import { FromSchema } from 'json-schema-to-ts'

const projectUsersRouter = async (app: FastifyInstance, _opt) => {
  // TODO : pas utilisé
  // Récupérer les membres d'un projet
  app.get<{
    Params: FromSchema<typeof getProjectUsersSchema['params']>
  }>('/:projectId/users',
    {
      schema: getProjectUsersSchema,
    },
    async (req, res) => {
      const user = req.session.user
      const projectId = req.params.projectId

      const users = await getProjectUsers(projectId)

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
    })

  // Récupérer des utilisateurs par match
  app.get<{
    Params: FromSchema<typeof getMatchingUsersSchema['params']>
    Querystring: FromSchema<typeof getMatchingUsersSchema['query']>
  }>('/:projectId/users/match',
    {
      schema: getMatchingUsersSchema,
    },
    async (req, res) => {
      const user = req.session.user
      const projectId = req.params.projectId
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
    })

  // Ajouter un membre dans un projet
  app.post<{
  Params: FromSchema<typeof addUserToProjectSchema['params']>
  Body: FromSchema<typeof addUserToProjectSchema['body']>
}>('/:projectId/users',
  {
    schema: addUserToProjectSchema,
  },
  async (req, res) => {
    const user = req.session.user
    const projectId = req.params.projectId
    const data = req.body

    const project = await getProjectInfos(projectId)

    if (!user.groups?.includes(adminGroupPath)) {
      await checkProjectRole(user.id, { roles: project.roles, minRole: 'owner' })
    }

    await checkProjectLocked(project)

    const newRoles = await addUserToProject(project, data.email, user.id)
    const description = 'Utilisateur ajouté au projet avec succès'

    addReqLogs({
      req,
      description,
      extras: {
        projectId,
        email: data.email,
      },
    })
    sendCreated(res, newRoles)
  })

  // Mettre à jour un membre d'un projet
  app.put<{
  Params: FromSchema<typeof updateUserProjectRoleSchema['params']>
  Body: FromSchema<typeof updateUserProjectRoleSchema['body']>
}>('/:projectId/users/:userId',
  {
    schema: updateUserProjectRoleSchema,
  },
  async (req, res) => {
    const user = req.session.user
    const projectId = req.params.projectId
    const userToUpdateId = req.params.userId
    const data = req.body

    const project = await getProjectInfos(projectId)

    if (!user.groups?.includes(adminGroupPath)) {
      await checkProjectRole(user.id, { roles: project.roles, minRole: 'owner' })
    }

    await checkProjectLocked(project)

    const newRoles = await updateUserProjectRole(userToUpdateId, project, data.role)

    const description = 'Rôle de l\'utilisateur mis à jour avec succès'
    addReqLogs({
      req,
      description,
      extras: {
        projectId,
        userId: userToUpdateId,
      },
    })
    sendOk(res, newRoles)
  },
)

  // Supprimer un membre d'un projet
  app.delete<{
  Params: FromSchema<typeof removeUserFromProjectSchema['params']>
}>('/:projectId/users/:userId',
  {
    schema: removeUserFromProjectSchema,
  },
  async (req, res) => {
    const user = req.session.user
    const projectId = req.params.projectId
    const userToRemoveId = req.params.userId

    const project = await getProjectInfos(projectId)

    if (!user.groups?.includes(adminGroupPath)) {
      await checkProjectRole(user.id, { roles: project.roles, minRole: 'owner' })
    }

    await checkProjectLocked(project)

    const newRoles = await removeUserFromProject(userToRemoveId, project, user.id)

    const description = 'Utilisateur retiré du projet avec succès'
    addReqLogs({
      req,
      description,
      extras: {
        projectId,
        userId: userToRemoveId,
      },
    })
    sendOk(res, newRoles)
  })
}

const usersRouter = async (app: FastifyInstance, _opt) => {
  app.get<{
    Querystring: FromSchema<typeof getSpecificUsersSchema['query']>
  }>('/',
    {
      schema: getSpecificUsersSchema,
    },
    async (req, res) => {
      const usersIds = req.query.ids.split(',')
      const users = await getSpecificUsers(usersIds)

      addReqLogs({
        req,
        description: 'Utilisateurs récupérés avec succès',
        // extras: {
        //   usersIds: usersIds.join(','),
        // },
      })
      res.status(200).send(users)
    })
}

export { projectUsersRouter, usersRouter }
