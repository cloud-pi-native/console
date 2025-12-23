import { ServerService } from '@/cpin-module/infrastructure/server/server.service';
import { AdminAuthorized, systemPluginContract } from '@cpn-console/shared';
import { Injectable } from '@nestjs/common';
import {
    getPluginsConfig,
    updatePluginConfig,
} from '@old-server/resources/system/config/business';
import { authUser } from '@old-server/utils/controller';
import { ErrorResType, Forbidden403 } from '@old-server/utils/errors';

@Injectable()
export class SystemConfigRouterService {
    constructor(private readonly serverService: ServerService) {}

    systemConfigRouter() {
        return this.serverService.serverInstance.router(systemPluginContract, {
            // Récupérer les configurations plugins
            getPluginsConfig: async ({ request: req }) => {
                const perms = await authUser(req);
                if (!AdminAuthorized.isAdmin(perms.adminPermissions))
                    return new Forbidden403();

                const services = await getPluginsConfig();

                return {
                    status: 200,
                    body: services,
                };
            },
            // Mettre à jour les configurations plugins
            updatePluginsConfig: async ({ request: req, body }) => {
                const perms = await authUser(req);
                if (!AdminAuthorized.isAdmin(perms.adminPermissions))
                    return new Forbidden403();

                const resBody = await updatePluginConfig(body);
                if (resBody instanceof ErrorResType) return resBody;

                return {
                    status: 204,
                    body: resBody,
                };
            },
        });
    }
}
