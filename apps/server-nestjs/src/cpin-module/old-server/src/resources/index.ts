import { Injectable } from '@nestjs/common';
import { AppService } from '@old-server/app';
import type { FastifyInstance } from 'fastify';

import { AdminRoleRouterService } from './admin-role/router';
import { AdminTokenRouterService } from './admin-token/router';
import { ClusterRouterService } from './cluster/router';
import { EnvironmentRouterService } from './environment/router';
import { LogRouterService } from './log/router';
import { ProjectMemberRouterService } from './project-member/router';
import { ProjectRoleRouterService } from './project-role/router';
import { ProjectServiceRouterService } from './project-service/router';
import { ProjectRouterService } from './project/router';
import { RepositoryRouterService } from './repository/router';
import { ServiceChainRouterService } from './service-chain/router';
import { ServiceMonitorRouterService } from './service-monitor/router';
import { StageRouterService } from './stage/router';
import { SystemConfigRouterService } from './system/config/router';
import { SystemRouterService } from './system/router';
import { SystemSettingsRouterService } from './system/settings/router';
import { UserRouterService } from './user/router';
import { UserTokensRouterService } from './user/tokens/router';
import { ZoneRouterService } from './zone/router';

@Injectable()
export class ResourcesService {
    constructor(
        private readonly appService: AppService,
        private readonly adminRoleRouterService: AdminRoleRouterService,
        private readonly adminTokenRouterService: AdminTokenRouterService,
        private readonly clusterRouterService: ClusterRouterService,
        private readonly environmentRouterService: EnvironmentRouterService,
        private readonly logRouterService: LogRouterService,
        private readonly projectMemberRouterService: ProjectMemberRouterService,
        private readonly projectRoleRouterService: ProjectRoleRouterService,
        private readonly projectServiceRouterService: ProjectServiceRouterService,
        private readonly projectRouterService: ProjectRouterService,
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
    validateTrue = {
        responseValidation: process.env.NO_VALIDATION !== 'true',
    };

    apiRouter() {
        return async (app: FastifyInstance) => {
            await app.register(
                this.appService.serverInstance.plugin(
                    this.adminRoleRouterService.adminRoleRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.appService.serverInstance.plugin(
                    this.adminTokenRouterService.adminTokenRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.appService.serverInstance.plugin(
                    this.clusterRouterService.clusterRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.appService.serverInstance.plugin(
                    this.serviceChainRouterService.serviceChainRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.appService.serverInstance.plugin(
                    this.environmentRouterService.environmentRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.appService.serverInstance.plugin(
                    this.logRouterService.logRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.appService.serverInstance.plugin(
                    this.userTokensRouterService.personalAccessTokenRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.appService.serverInstance.plugin(
                    this.projectRouterService.projectRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.appService.serverInstance.plugin(
                    this.projectMemberRouterService.projectMemberRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.appService.serverInstance.plugin(
                    this.projectRoleRouterService.projectRoleRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.appService.serverInstance.plugin(
                    this.projectServiceRouterService.projectServiceRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.appService.serverInstance.plugin(
                    this.repositoryRouterService.repositoryRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.appService.serverInstance.plugin(
                    this.serviceMonitorRouterService.serviceMonitorRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.appService.serverInstance.plugin(
                    this.systemConfigRouterService.pluginConfigRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.appService.serverInstance.plugin(
                    this.stageRouterService.stageRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.appService.serverInstance.plugin(
                    this.systemRouterService.systemRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.appService.serverInstance.plugin(
                    this.systemSettingsRouterService.systemSettingsRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.appService.serverInstance.plugin(
                    this.userRouterService.userRouter(),
                ),
                this.validateTrue,
            );
            await app.register(
                this.appService.serverInstance.plugin(
                    this.zoneRouterService.zoneRouter(),
                ),
                this.validateTrue,
            );
        };
    }
}
