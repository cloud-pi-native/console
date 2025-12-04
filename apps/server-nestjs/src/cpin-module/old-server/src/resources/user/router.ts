import { AdminAuthorized, userContract } from '@cpn-console/shared';
import { Injectable } from '@nestjs/common';
import { AppService } from '@old-server/app.js';
import '@old-server/types/index.js';
import { authUser } from '@old-server/utils/controller.js';
import {
    ErrorResType,
    Forbidden403,
    Unauthorized401,
} from '@old-server/utils/errors.js';

import {
    getMatchingUsers,
    getUsers,
    logViaSession,
    patchUsers,
} from './business.js';

@Injectable()
export class UserRouterService {
    constructor(private readonly appService: AppService) {}

    userRouter() {
        return this.appService.serverInstance.router(userContract, {
            getMatchingUsers: async ({ query }) => {
                const usersMatching = await getMatchingUsers(query);

                return {
                    status: 200,
                    body: usersMatching,
                };
            },

            auth: async ({ request: req }) => {
                const user = req.session.user;

                if (!user) return new Unauthorized401();

                const { user: body } = await logViaSession(user);

                return {
                    status: 200,
                    body,
                };
            },

            getAllUsers: async ({
                request: req,
                query: { relationType, ...query },
            }) => {
                const perms = await authUser(req);

                if (!AdminAuthorized.isAdmin(perms.adminPermissions))
                    return new Forbidden403();

                const body = await getUsers(query, relationType);
                if (body instanceof ErrorResType) return body;

                return {
                    status: 200,
                    body,
                };
            },

            patchUsers: async ({ request: req, body }) => {
                const perms = await authUser(req);
                if (!AdminAuthorized.isAdmin(perms.adminPermissions))
                    return new Forbidden403();

                const users = await patchUsers(body);

                return {
                    status: 200,
                    body: users,
                };
            },
        });
    }
}
