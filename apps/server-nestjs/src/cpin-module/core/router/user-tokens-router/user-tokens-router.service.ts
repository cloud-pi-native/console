import { ServerService } from '@/cpin-module/infrastructure/server/server.service';
import { personalAccessTokenContract } from '@cpn-console/shared';
import { Injectable } from '@nestjs/common';
import {
    createToken,
    deleteToken,
    listTokens,
} from '@old-server/resources/user/tokens/business';
// @TODO: Nécessaire ?
// import '@old-server/types/index';
import { authUser } from '@old-server/utils/controller';
import { ErrorResType, Forbidden403 } from '@old-server/utils/errors';

@Injectable()
export class UserTokensRouterService {
    constructor(private readonly serverService: ServerService) {}

    userTokensRouter() {
        return this.serverService.serverInstance.router(
            personalAccessTokenContract,
            {
                listPersonalAccessTokens: async ({ request: req }) => {
                    const perms = await authUser(req);

                    if (!perms.user?.id || perms.user?.type !== 'human')
                        return new Forbidden403();
                    const body = await listTokens(perms.user.id);

                    return {
                        status: 200,
                        body,
                    };
                },

                createPersonalAccessToken: async ({
                    request: req,
                    body: data,
                }) => {
                    const perms = await authUser(req);

                    if (!perms.user?.id || perms.user?.type !== 'human')
                        return new Forbidden403();
                    const body = await createToken(data, perms.user.id);
                    if (body instanceof ErrorResType) return body;

                    return {
                        status: 201,
                        body,
                    };
                },

                deletePersonalAccessToken: async ({ request: req, params }) => {
                    const perms = await authUser(req);

                    if (!perms.user?.id || perms.user?.type !== 'human')
                        return new Forbidden403();
                    await deleteToken(params.tokenId, perms.user.id);

                    return {
                        status: 204,
                        body: null,
                    };
                },
            },
        );
    }
}
