import type { FastifyInstance } from 'fastify'
import { clusterRouter } from './cluster/router'
import { environmentRouter } from './environment/router'
import { logRouter } from './log/router'
import { projectRouter } from './project/router'
import { adminRoleRouter } from './admin-role/router'
import { projectRoleRouter } from './project-role/router'
import { projectMemberRouter } from './project-member/router'
import { quotaRouter } from './quota/router'
import { repositoryRouter } from './repository/router'
import { serviceMonitorRouter } from './service-monitor/router'
import { projectServiceRouter } from './project-service/router'
import { stageRouter } from './stage/router'
import { systemRouter } from './system/router'
import { pluginConfigRouter } from './system/config/router'
import { userRouter } from './user/router'
import { zoneRouter } from './zone/router'
import { systemSettingsRouter } from './system/settings/router'
import { adminTokenRouter } from './admin-token/router'
import { personalAccessTokenRouter } from './user/tokens/router'
import { serverInstance } from '@/app'

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
    await app.register(serverInstance.plugin(pluginConfigRouter()), validateTrue)
    await app.register(serverInstance.plugin(stageRouter()), validateTrue)
    await app.register(serverInstance.plugin(systemRouter()), validateTrue)
    await app.register(serverInstance.plugin(systemSettingsRouter()), validateTrue)
    await app.register(serverInstance.plugin(userRouter()), validateTrue)
    await app.register(serverInstance.plugin(zoneRouter()), validateTrue)
  }
}
