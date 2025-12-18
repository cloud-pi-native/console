import { ServerService } from '@/cpin-module/infrastructure/server/server.service';
import { AdminAuthorized, adminRoleContract } from '@cpn-console/shared';
import { Injectable } from '@nestjs/common';
import {
    countRolesMembers,
    createRole,
    deleteRole,
    listRoles,
    patchRoles,
} from '@old-server/resources/admin-role/business';
import { authUser } from '@old-server/utils/controller';
import { ErrorResType, Forbidden403 } from '@old-server/utils/errors';

@Injectable()
export class AdminRoleRouterService {
    constructor(private readonly serverService: ServerService) {}

    adminRoleRouter() {
        return this.serverService.serverInstance.router(adminRoleContract, {
            async listAdminRoles() {
                const body = await listRoles();

                return {
                    status: 200,
                    body,
                };
            },

            async createAdminRole({ request: req, body }) {
                const perms = await authUser(req);
                if (!AdminAuthorized.isAdmin(perms.adminPermissions))
                    return new Forbidden403();

                const resBody = await createRole(body);

                return {
                    status: 201,
                    body: resBody,
                };
            },

            async patchAdminRoles({ request: req, body }) {
                const perms = await authUser(req);
                if (!AdminAuthorized.isAdmin(perms.adminPermissions))
                    return new Forbidden403();

                const resBody = await patchRoles(body);
                if (resBody instanceof ErrorResType) return resBody;

                return {
                    status: 200,
                    body: resBody,
                };
            },

            async adminRoleMemberCounts({ request: req }) {
                const perms = await authUser(req);
                if (!AdminAuthorized.isAdmin(perms.adminPermissions))
                    return new Forbidden403();

                const resBody = await countRolesMembers();

                return {
                    status: 200,
                    body: resBody,
                };
            },

            async deleteAdminRole({ request: req, params }) {
                const perms = await authUser(req);
                if (!AdminAuthorized.isAdmin(perms.adminPermissions))
                    return new Forbidden403();

                const resBody = await deleteRole(params.roleId);

                return {
                    status: 204,
                    body: resBody,
                };
            },
        });
    }
}
