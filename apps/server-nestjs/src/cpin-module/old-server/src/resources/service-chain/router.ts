import type { AsyncReturnType } from '@cpn-console/shared';
import { AdminAuthorized, serviceChainContract } from '@cpn-console/shared';
import { Injectable } from '@nestjs/common';
import { AppService } from '@old-server/app';
import '@old-server/types/index';
import { authUser } from '@old-server/utils/controller';
import { Forbidden403 } from '@old-server/utils/errors';

import {
    getServiceChainDetails as getServiceChainDetailsBusiness,
    getServiceChainFlows as getServiceChainFlowsBusiness,
    listServiceChains as listServiceChainsBusiness,
    retryServiceChain as retryServiceChainBusiness,
    validateServiceChain as validateServiceChainBusiness,
} from './business';

@Injectable()
export class ServiceChainRouterService {
    constructor(private readonly appService: AppService) {}

    serviceChainRouter() {
        return this.appService.serverInstance.router(serviceChainContract, {
            listServiceChains: async ({ request: req }) => {
                const { adminPermissions } = await authUser(req);

                let body: AsyncReturnType<typeof listServiceChainsBusiness> =
                    [];
                if (AdminAuthorized.isAdmin(adminPermissions)) {
                    body = await listServiceChainsBusiness();
                }

                return {
                    status: 200,
                    body,
                };
            },

            getServiceChainDetails: async ({ params, request: req }) => {
                const perms = await authUser(req);
                if (!AdminAuthorized.isAdmin(perms.adminPermissions))
                    return new Forbidden403();

                const serviceChainId = params.serviceChainId;
                const serviceChainDetails =
                    await getServiceChainDetailsBusiness(serviceChainId);

                return {
                    status: 200,
                    body: serviceChainDetails,
                };
            },

            retryServiceChain: async ({ params, request: req }) => {
                const perms = await authUser(req);
                if (!AdminAuthorized.isAdmin(perms.adminPermissions))
                    return new Forbidden403();

                const serviceChainId = params.serviceChainId;
                await retryServiceChainBusiness(serviceChainId);

                return {
                    status: 204,
                    body: null,
                };
            },

            validateServiceChain: async ({ params, request: req }) => {
                const perms = await authUser(req);
                if (!AdminAuthorized.isAdmin(perms.adminPermissions))
                    return new Forbidden403();

                const serviceChainId = params.validationId;
                await validateServiceChainBusiness(serviceChainId);

                return {
                    status: 204,
                    body: null,
                };
            },

            getServiceChainFlows: async ({ params, request: req }) => {
                const perms = await authUser(req);
                if (!AdminAuthorized.isAdmin(perms.adminPermissions))
                    return new Forbidden403();

                const serviceChainId = params.serviceChainId;
                const serviceChainFlows =
                    await getServiceChainFlowsBusiness(serviceChainId);

                return {
                    status: 200,
                    body: serviceChainFlows,
                };
            },
        });
    }
}
