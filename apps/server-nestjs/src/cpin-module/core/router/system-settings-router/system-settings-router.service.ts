import type { ServerService } from '@/cpin-module/infrastructure/server/server.service';
import { AdminAuthorized, systemSettingsContract } from '@cpn-console/shared';
import { Injectable } from '@nestjs/common';
import {
    getSystemSettings,
    upsertSystemSetting,
} from '@old-server/resources/system/settings/business';
import { authUser } from '@old-server/utils/controller';
import { Forbidden403 } from '@old-server/utils/errors';

@Injectable()
export class SystemSettingsRouterService {
    constructor(private readonly serverService: ServerService) {}

    systemSettingsRouter() {
        return this.serverService.serverInstance.router(
            systemSettingsContract,
            {
                listSystemSettings: async ({ query }) => {
                    const systemSettings = await getSystemSettings(query.key);

                    return {
                        status: 200,
                        body: systemSettings,
                    };
                },

                upsertSystemSetting: async ({ request: req, body: data }) => {
                    const perms = await authUser(req);
                    if (!AdminAuthorized.isAdmin(perms.adminPermissions))
                        return new Forbidden403();

                    const systemSetting = await upsertSystemSetting(data);

                    return {
                        status: 201,
                        body: systemSetting,
                    };
                },
            },
        );
    }
}
