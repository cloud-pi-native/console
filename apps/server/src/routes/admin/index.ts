import userRouter from './user.js'
import organizationRouter from './organization.js'
import projectRouter from './project.js'
import logRouter from './log.js'
import dbRouter from './db.js'
import clusterRouter from './cluster.js'
import { checkAdminGroup } from '@/utils/controller.js'

const router = async (app, _opt) => {
  app.addHook('preHandler', checkAdminGroup)
  // Enregistrement du sous routeur user
  await app.register(userRouter, { prefix: '/users' })

  // Enregistrement du sous routeur organization
  await app.register(organizationRouter, { prefix: '/organizations' })

  // Enregistrement du sous routeur project
  await app.register(projectRouter, { prefix: '/projects' })

  // Enregistrement du sous routeur logs
  await app.register(logRouter, { prefix: '/logs' })

  // Enregistrement du sous routeur cluster
  await app.register(clusterRouter, { prefix: '/clusters' })

  // Enregistrement du sous routeur db
  await app.register(dbRouter, { prefix: '/db' })
}

export default router
