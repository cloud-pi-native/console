import { AdminAuthorized, serviceContract } from '@cpn-console/shared';
import { Injectable } from '@nestjs/common';
import { AppService } from '@old-server/app.js';
import { authUser } from '@old-server/utils/controller.js';
import { Forbidden403 } from '@old-server/utils/errors.js';

import { checkServicesHealth, refreshServicesHealth } from './business.js';

@Injectable()
export class ServiceMonitorRouterService {
    constructor(private readonly appService: AppService) {}

    serviceMonitorRouter() {
        return this.appService.serverInstance.router(serviceContract, {
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
