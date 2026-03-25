import type { FastifyInstance } from 'fastify'
import { serverInstance } from '../app.ts'

import { adminRoleRouter } from './admin-role/router.ts'
import { adminTokenRouter } from './admin-token/router.ts'
import { clusterRouter } from './cluster/router.ts'
import { environmentRouter } from './environment/router.ts'
import { logRouter } from './log/router.ts'
import { projectMemberRouter } from './project-member/router.ts'
import { projectRoleRouter } from './project-role/router.ts'
import { projectServiceRouter } from './project-service/router.ts'
import { projectRouter } from './project/router.ts'
import { repositoryRouter } from './repository/router.ts'
import { serviceChainRouter } from './service-chain/router.ts'
import { serviceMonitorRouter } from './service-monitor/router.ts'
import { stageRouter } from './stage/router.ts'
import { pluginConfigRouter } from './system/config/router.ts'
import { systemRouter } from './system/router.ts'
import { systemSettingsRouter } from './system/settings/router.ts'
import { userRouter } from './user/router.ts'
import { personalAccessTokenRouter } from './user/tokens/router.ts'
import { zoneRouter } from './zone/router.ts'

// relax validation schema if NO_VALIDATION env var is set to true.
// /!\ It can lead to security leaks !!!!
const validateTrue = { responseValidation: process.env.NO_VALIDATION !== 'true' }
export function apiRouter() {
  return async (app: FastifyInstance) => {
    await app.register(serverInstance.plugin(adminRoleRouter()), validateTrue)
    await app.register(serverInstance.plugin(adminTokenRouter()), validateTrue)
    await app.register(serverInstance.plugin(clusterRouter()), validateTrue)
    await app.register(serverInstance.plugin(serviceChainRouter()), validateTrue)
    await app.register(serverInstance.plugin(environmentRouter()), validateTrue)
    await app.register(serverInstance.plugin(logRouter()), validateTrue)
    await app.register(serverInstance.plugin(personalAccessTokenRouter()), validateTrue)
    await app.register(serverInstance.plugin(projectRouter()), validateTrue)
    await app.register(serverInstance.plugin(projectMemberRouter()), validateTrue)
    await app.register(serverInstance.plugin(projectRoleRouter()), validateTrue)
    await app.register(serverInstance.plugin(projectServiceRouter()), validateTrue)
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
