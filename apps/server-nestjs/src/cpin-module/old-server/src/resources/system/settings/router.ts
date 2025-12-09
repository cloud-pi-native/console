import { AdminAuthorized, systemSettingsContract } from '@cpn-console/shared';
import { Injectable } from '@nestjs/common';
import { AppService } from '@old-server/app';
import { authUser } from '@old-server/utils/controller';
import { Forbidden403 } from '@old-server/utils/errors';

import { getSystemSettings, upsertSystemSetting } from './business';

@Injectable()
export class SystemSettingsRouterService {
    constructor(private readonly appService: AppService) {}

    systemSettingsRouter() {
        return this.appService.serverInstance.router(systemSettingsContract, {
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
        });
    }
}
