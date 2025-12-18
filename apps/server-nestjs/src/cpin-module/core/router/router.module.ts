import { ConfigurationModule } from '@/cpin-module/infrastructure/configuration/configuration.module';
import { InfrastructureModule } from '@/cpin-module/infrastructure/infrastructure.module';
import { Module } from '@nestjs/common';

import { AdminRoleRouterService } from './admin-role-router/admin-role-router.service';
import { AdminTokenRouterService } from './admin-token-router/admin-token-router.service';
import { ClusterRouterService } from './cluster-router/cluster-router.service';
import { EnvironmentRouterService } from './environment-router/environment-router.service';
import { LogRouterService } from './log-router/log-router.service';
import { ProjectMemberRouterService } from './project-member-router/project-member-router.service';
import { ProjectRoleRouterService } from './project-role-router/project-role-router.service';
import { ProjectRouterService } from './project-router/project-router.service';
import { ProjectServiceRouterService } from './project-service-router/project-service-router.service';
import { RepositoryRouterService } from './repository-router/repository-router.service';
import { RouterService } from './router.service';
import { ServiceChainRouterService } from './service-chain-router/service-chain-router.service';
import { ServiceMonitorRouterService } from './service-monitor-router/service-monitor-router.service';
import { StageRouterService } from './stage-router/stage-router.service';
import { SystemConfigRouterService } from './system-config-router/system-config-router.service';
import { SystemRouterService } from './system-router/system-router.service';
import { SystemSettingsRouterService } from './system-settings-router/system-settings-router.service';
import { UserRouterService } from './user-router/user-router.service';
import { UserTokensRouterService } from './user-tokens-router/user-tokens-router.service';
import { ZoneRouterService } from './zone-router/zone-router.service';

@Module({
    imports: [InfrastructureModule, ConfigurationModule],
    providers: [
        AdminRoleRouterService,
        AdminTokenRouterService,
        ClusterRouterService,
        EnvironmentRouterService,
        LogRouterService,
        ProjectMemberRouterService,
        ProjectRoleRouterService,
        ProjectRouterService,
        ProjectServiceRouterService,
        RepositoryRouterService,
        RouterService,
        ServiceChainRouterService,
        ServiceMonitorRouterService,
        StageRouterService,
        SystemConfigRouterService,
        SystemRouterService,
        SystemSettingsRouterService,
        UserRouterService,
        UserTokensRouterService,
        ZoneRouterService,
    ],
    exports: [RouterService],
})
export class RouterModule {}
