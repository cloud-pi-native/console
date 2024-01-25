import clusterRouter from './cluster/admin/controllers.js'
import dbRouter from './system/db/controllers.js'
import logRouter from './log/admin/controllers.js'
import organizationRouter from './organization/admin/controllers.js'
import projectRouter from './project/admin/controllers.js'
import quotaRouter from './quota/admin/controllers.js'
import stageRouter from './stage/admin/controllers.js'
import userRouter from './user/admin/controllers.js'
import { checkAdminGroup } from '@/utils/controller.js'
import { type FastifyInstance } from 'fastify'

const router = async (app: FastifyInstance, _opt) => {
  app.addHook('preHandler', checkAdminGroup)
  // Enregistrement du sous routeur user
  app.register(userRouter, { prefix: '/users' })

  // Enregistrement du sous routeur organization
  app.register(organizationRouter, { prefix: '/organizations' })

  // Enregistrement du sous routeur project
  app.register(projectRouter, { prefix: '/projects' })

  // Enregistrement du sous routeur logs
  app.register(logRouter, { prefix: '/logs' })

  // Enregistrement du sous routeur cluster
  app.register(clusterRouter, { prefix: '/clusters' })

  // Enregistrement du sous routeur db
  app.register(dbRouter, { prefix: '/db' })

  // Enregistrement du sous routeur quota
  app.register(quotaRouter, { prefix: '/quotas' })

  // Enregistrement du sous routeur stage
  app.register(stageRouter, { prefix: '/stages' })
}

export default router
