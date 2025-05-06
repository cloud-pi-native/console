import type { FastifyInstance } from 'fastify'
import { clusterRouter } from './cluster/router.js'
import { environmentRouter } from './environment/router.js'
import { logRouter } from './log/router.js'
import { projectRouter } from './project/router.js'
import { adminRoleRouter } from './admin-role/router.js'
import { projectRoleRouter } from './project-role/router.js'
import { projectMemberRouter } from './project-member/router.js'
import { quotaRouter } from './quota/router.js'
import { repositoryRouter } from './repository/router.js'
import { serviceMonitorRouter } from './service-monitor/router.js'
import { projectServiceRouter } from './project-service/router.js'
import { stageRouter } from './stage/router.js'
import { systemRouter } from './system/router.js'
import { pluginRouter } from './plugin/router.js'
import { userRouter } from './user/router.js'
import { zoneRouter } from './zone/router.js'
import { systemSettingsRouter } from './system/settings/router.js'
import { adminTokenRouter } from './admin-token/router.js'
import { personalAccessTokenRouter } from './user/tokens/router.js'
import { serverInstance } from '@/app.js'

// relax validation schema if NO_VALIDATION env var is set to true.
// /!\ It can lead to security leaks !!!!
const validateTrue = { responseValidation: process.env.NO_VALIDATION !== 'true' }
export function apiRouter() {
  return async (app: FastifyInstance) => {
    await app.register(serverInstance.plugin(adminRoleRouter()), validateTrue)
    await app.register(serverInstance.plugin(adminTokenRouter()), validateTrue)
    await app.register(serverInstance.plugin(clusterRouter()), validateTrue)
    await app.register(serverInstance.plugin(environmentRouter()), validateTrue)
    await app.register(serverInstance.plugin(logRouter()), validateTrue)
    await app.register(serverInstance.plugin(personalAccessTokenRouter()), validateTrue)
    await app.register(serverInstance.plugin(projectRouter()), validateTrue)
    await app.register(serverInstance.plugin(projectMemberRouter()), validateTrue)
    await app.register(serverInstance.plugin(projectRoleRouter()), validateTrue)
    await app.register(serverInstance.plugin(projectServiceRouter()), validateTrue)
    await app.register(serverInstance.plugin(quotaRouter()), validateTrue)
    await app.register(serverInstance.plugin(repositoryRouter()), validateTrue)
    await app.register(serverInstance.plugin(serviceMonitorRouter()), validateTrue)
    await app.register(serverInstance.plugin(pluginRouter()), validateTrue)
    await app.register(serverInstance.plugin(stageRouter()), validateTrue)
    await app.register(serverInstance.plugin(systemRouter()), validateTrue)
    await app.register(serverInstance.plugin(systemSettingsRouter()), validateTrue)
    await app.register(serverInstance.plugin(userRouter()), validateTrue)
    await app.register(serverInstance.plugin(zoneRouter()), validateTrue)
  }
}
