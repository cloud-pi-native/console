import type { ServerService } from '@/cpin-module/infrastructure/server/server.service';
import { AdminAuthorized, serviceContract } from '@cpn-console/shared';
import { Injectable } from '@nestjs/common';
import {
    checkServicesHealth,
    refreshServicesHealth,
} from '@old-server/resources/service-monitor/business';
import { authUser } from '@old-server/utils/controller';
import { Forbidden403 } from '@old-server/utils/errors';

@Injectable()
export class ServiceMonitorRouterService {
    constructor(private readonly serverService: ServerService) {}

    serviceMonitorRouter() {
        return this.serverService.serverInstance.router(serviceContract, {
            getServiceHealth: async () => {
                const serviceData = checkServicesHealth();

                return {
                    status: 200,
                    body: serviceData,
                };
            },

            getCompleteServiceHealth: async ({ request: req }) => {
                const { adminPermissions } = await authUser(req);

                if (!AdminAuthorized.isAdmin(adminPermissions))
                    return new Forbidden403();
                const serviceData = checkServicesHealth();

                return {
                    status: 200,
                    body: serviceData,
                };
            },

            refreshServiceHealth: async ({ request: req }) => {
                const { adminPermissions } = await authUser(req);
                if (!AdminAuthorized.isAdmin(adminPermissions))
                    return new Forbidden403();

                await refreshServicesHealth();
                const serviceData = checkServicesHealth();

                return {
                    status: 200,
                    body: serviceData,
                };
            },
        });
    }
}
