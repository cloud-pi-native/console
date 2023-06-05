import userRouter from './user.js'
import organizationRouter from './organization.js'
import projectRouter from './project.js'
import { adminGroupPath } from 'shared/src/utils/const.js'
import { sendForbidden } from '../../utils/response.js'

const router = async (app, _opt) => {
  app.addHook('preHandler', (req, res, done) => {
    if (!req.session.user.groups?.includes(adminGroupPath)) {
      sendForbidden(res, 'Vous n\'avez pas les droits administrateur')
    }
    done()
  })
  // Enregistrement du sous routeur user
  await app.register(userRouter, { prefix: '/users' })

  // Enregistrement du sous routeur organization
  await app.register(organizationRouter, { prefix: '/organizations' })

  // Enregistrement du sous routeur project
  await app.register(projectRouter, { prefix: '/projects' })
}

export default router
