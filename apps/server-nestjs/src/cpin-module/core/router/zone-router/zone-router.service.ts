import type { ServerService } from '@/cpin-module/infrastructure/server/server.service';
import { AdminAuthorized, zoneContract } from '@cpn-console/shared';
import { Injectable } from '@nestjs/common';
import {
    createZone,
    deleteZone,
    listZones,
    updateZone,
} from '@old-server/resources/zone/business';
import { authUser } from '@old-server/utils/controller';
import {
    ErrorResType,
    Forbidden403,
    Unauthorized401,
} from '@old-server/utils/errors';

@Injectable()
export class ZoneRouterService {
    constructor(private readonly serverService: ServerService) {}

    zoneRouter() {
        return this.serverService.serverInstance.router(zoneContract, {
            listZones: async () => {
                const zones = await listZones();

                return {
                    status: 200,
                    body: zones,
                };
            },

            createZone: async ({ request: req, body: data }) => {
                const { user, adminPermissions } = await authUser(req);
                if (!AdminAuthorized.isAdmin(adminPermissions))
                    return new Forbidden403();
                if (!user) {
                    return new Unauthorized401(
                        'Require to be requested from user not api key',
                    );
                }

                const body = await createZone(data, user.id, req.id);
                if (body instanceof ErrorResType) return body;

                return {
                    status: 201,
                    body,
                };
            },

            updateZone: async ({ request: req, params, body: data }) => {
                const { user, adminPermissions } = await authUser(req);
                if (!AdminAuthorized.isAdmin(adminPermissions))
                    return new Forbidden403();
                if (!user) {
                    return new Unauthorized401(
                        'Require to be requested from user not api key',
                    );
                }

                const zoneId = params.zoneId;

                const body = await updateZone(zoneId, data, user.id, req.id);
                if (body instanceof ErrorResType) return body;

                return {
                    status: 200,
                    body,
                };
            },

            deleteZone: async ({ request: req, params }) => {
                const { user, adminPermissions } = await authUser(req);
                if (!AdminAuthorized.isAdmin(adminPermissions))
                    return new Forbidden403();
                if (!user) {
                    return new Unauthorized401(
                        'Require to be requested from user not api key',
                    );
                }
                const zoneId = params.zoneId;

                const body = await deleteZone(zoneId, user.id, req.id);
                if (body instanceof ErrorResType) return body;

                return {
                    status: 204,
                    body,
                };
            },
        });
    }
}
