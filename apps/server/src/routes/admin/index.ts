import userRouter from './user.js'
import organizationRouter from './organization.js'
import projectRouter from './project.js'
import { checkAdminGroup } from '../../utils/controller.js'

const router = async (app, _opt) => {
  app.addHook('preHandler', checkAdminGroup)
  // Enregistrement du sous routeur user
  await app.register(userRouter, { prefix: '/users' })

  // Enregistrement du sous routeur organization
  await app.register(organizationRouter, { prefix: '/organizations' })

  // Enregistrement du sous routeur project
  await app.register(projectRouter, { prefix: '/projects' })
}

export default router
