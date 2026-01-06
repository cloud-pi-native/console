import type { ServerService } from '@/cpin-module/infrastructure/server/server.service';
import { Injectable } from '@nestjs/common';
import type { FastifyInstance } from 'fastify';

import type { AdminRoleRouterService } from './admin-role-router/admin-role-router.service';
import type { AdminTokenRouterService } from './admin-token-router/admin-token-router.service';
import type { ClusterRouterService } from './cluster-router/cluster-router.service';
import type { EnvironmentRouterService } from './environment-router/environment-router.service';
import type { LogRouterService } from './log-router/log-router.service';
import type { ProjectMemberRouterService } from './project-member-router/project-member-router.service';
import type { ProjectRoleRouterService } from './project-role-router/project-role-router.service';
import type { ProjectRouterService } from './project-router/project-router.service';
import type { ProjectServiceRouterService } from './project-service-router/project-service-router.service';
import type { RepositoryRouterService } from './repository-router/repository-router.service';
import type { ServiceChainRouterService } from './service-chain-router/service-chain-router.service';
import type { ServiceMonitorRouterService } from './service-monitor-router/service-monitor-router.service';
import type { StageRouterService } from './stage-router/stage-router.service';
import type { SystemConfigRouterService } from './system-config-router/system-config-router.service';
import type { SystemRouterService } from './system-router/system-router.service';
import type { SystemSettingsRouterService } from './system-settings-router/system-settings-router.service';
import type { UserRouterService } from './user-router/user-router.service';
import type { UserTokensRouterService } from './user-tokens-router/user-tokens-router.service';
import type { ZoneRouterService } from './zone-router/zone-router.service';

@Injectable()
export class RouterService {
    constructor(
        private readonly serverService: ServerService,
        private readonly adminRoleRouterService: AdminRoleRouterService,
        private readonly adminTokenRouterService: AdminTokenRouterService,
        private readonly clusterRouterService: ClusterRouterService,
        private readonly environmentRouterService: EnvironmentRouterService,
        private readonly logRouterService: LogRouterService,
        private readonly projectMemberRouterService: ProjectMemberRouterService,
        private readonly projectRoleRouterService: ProjectRoleRouterService,
        private readonly projectRouterService: ProjectRouterService,
        private readonly projectServiceRouterService: ProjectServiceRouterService,
        private readonly repositoryRouterService: RepositoryRouterService,
        private readonly serviceChainRouterService: ServiceChainRouterService,
        private readonly serviceMonitorRouterService: ServiceMonitorRouterService,
        private readonly stageRouterService: StageRouterService,
        private readonly systemConfigRouterService: SystemConfigRouterService,
        private readonly systemRouterService: SystemRouterService,
        private readonly systemSettingsRouterService: SystemSettingsRouterService,
        private readonly userRouterService: UserRouterService,
        private readonly userTokensRouterService: UserTokensRouterService,
        private readonly zoneRouterService: ZoneRouterService,
    ) {}

    // relax validation schema if NO_VALIDATION env var is set to true.
    // /!\ It can lead to security leaks !!!!
    validateTrue = { responseValidation: process.env.NO_VALIDATION !== 'true' };

    apiRouter() {
        return async (app: FastifyInstance) => {
            await app.register(
                this.serverService.serverInstance.plugin(
                    this.adminRoleRouterService.adminRoleRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.serverService.serverInstance.plugin(
                    this.adminTokenRouterService.adminTokenRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.serverService.serverInstance.plugin(
                    this.clusterRouterService.clusterRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.serverService.serverInstance.plugin(
                    this.serviceChainRouterService.serviceChainRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.serverService.serverInstance.plugin(
                    this.environmentRouterService.environmentRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.serverService.serverInstance.plugin(
                    this.logRouterService.logRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.serverService.serverInstance.plugin(
                    this.userTokensRouterService.userTokensRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.serverService.serverInstance.plugin(
                    this.projectRouterService.projectRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.serverService.serverInstance.plugin(
                    this.projectMemberRouterService.projectMemberRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.serverService.serverInstance.plugin(
                    this.projectRoleRouterService.projectRoleRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.serverService.serverInstance.plugin(
                    this.projectServiceRouterService.projectServiceRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.serverService.serverInstance.plugin(
                    this.repositoryRouterService.repositoryRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.serverService.serverInstance.plugin(
                    this.serviceMonitorRouterService.serviceMonitorRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.serverService.serverInstance.plugin(
                    this.systemConfigRouterService.systemConfigRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.serverService.serverInstance.plugin(
                    this.stageRouterService.stageRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.serverService.serverInstance.plugin(
                    this.systemRouterService.systemRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.serverService.serverInstance.plugin(
                    this.systemSettingsRouterService.systemSettingsRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.serverService.serverInstance.plugin(
                    this.userRouterService.userRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.serverService.serverInstance.plugin(
                    this.zoneRouterService.zoneRouter(),
                ),
                this.validateTrue,
            );
        };
    }
}
