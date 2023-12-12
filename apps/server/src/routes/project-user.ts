import {
  getProjectUsersController,
  addUserToProjectController,
  removeUserFromProjectController,
  updateUserProjectRoleController,
  getMatchingUsersController,
} from '@/resources/user/controllers.js'
import { addUserToProjectSchema, getMatchingUsersSchema, getProjectUsersSchema, removeUserFromProjectSchema, updateUserProjectRoleSchema } from '@dso-console/shared'
import { type FastifyInstance } from 'fastify'

const router = async (app: FastifyInstance, _opt) => {
  // TODO : pas utilisé
  // Récupérer les membres d'un projet
  app.get('/:projectId/users',
    {
      schema: getProjectUsersSchema,
    },
    getProjectUsersController)

  // Récupérer des utilisateurs par match
  app.get('/:projectId/users/match',
    {
      schema: getMatchingUsersSchema,
    },
    getMatchingUsersController)

  // Ajouter un membre dans un projet
  app.post('/:projectId/users',
    {
      schema: addUserToProjectSchema,
    },
    addUserToProjectController)

  // Mettre à jour un membre d'un projet
  app.put('/:projectId/users/:userId',
    {
      schema: updateUserProjectRoleSchema,
    },
    updateUserProjectRoleController)

  // Supprimer un membre d'un projet
  app.delete('/:projectId/users/:userId',
    {
      schema: removeUserFromProjectSchema,
    },
    removeUserFromProjectController)
}

export default router
