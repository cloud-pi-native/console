import { type FastifyInstance } from 'fastify'
import { clusterRouter } from './cluster/router.js'
import { environmentRouter } from './environment/router.js'
import { filesRouter } from '../generate-files/router.js'
import { organizationRouter } from './organization/router.js'
import { permissionRouter } from './permission/router.js'
import { projectRouter } from './project/router.js'
import { quotaRouter } from './quota/router.js'
import { repositoryRouter } from './repository/router.js'
import { serviceMonitorRouter } from './service-monitor/router.js'
import { projectServiceRouter } from './project-service/router.js'
import { stageRouter } from './stage/router.js'
import { systemRouter } from './system/router.js'
import { pluginConfigRouter } from './system/config/router.js'
import { userRouter } from './user/router.js'
import { zoneRouter } from './zone/router.js'
import { serverInstance } from '@/app.js'

export const apiRouter = () => async (app: FastifyInstance) => {
  await app.register(serverInstance.plugin(clusterRouter()), { responseValidation: true })
  await app.register(serverInstance.plugin(environmentRouter()), { responseValidation: true })
  await app.register(serverInstance.plugin(filesRouter()), { responseValidation: true })
  await app.register(serverInstance.plugin(organizationRouter()), { responseValidation: true })
  await app.register(serverInstance.plugin(permissionRouter()), { responseValidation: true })
  await app.register(serverInstance.plugin(projectRouter()), { responseValidation: true })
  await app.register(serverInstance.plugin(projectServiceRouter()), { responseValidation: true })
  await app.register(serverInstance.plugin(quotaRouter()), { responseValidation: true })
  await app.register(serverInstance.plugin(repositoryRouter()), { responseValidation: true })
  await app.register(serverInstance.plugin(serviceMonitorRouter()), { responseValidation: true })
  await app.register(serverInstance.plugin(pluginConfigRouter()), { responseValidation: true })
  await app.register(serverInstance.plugin(stageRouter()), { responseValidation: true })
  await app.register(serverInstance.plugin(systemRouter()), { responseValidation: true })
  await app.register(serverInstance.plugin(userRouter()), { responseValidation: true })
  await app.register(serverInstance.plugin(zoneRouter()), { responseValidation: true })
}
