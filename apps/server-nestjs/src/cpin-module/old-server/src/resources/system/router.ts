import { systemContract } from '@cpn-console/shared';
import { Injectable } from '@nestjs/common';
import { AppService } from '@old-server/app';
import { appVersion } from '@old-server/utils/env';

@Injectable()
export class SystemRouterService {
    constructor(private readonly appService: AppService) {}

    systemRouter() {
        return this.appService.serverInstance.router(systemContract, {
            getVersion: async () => ({
                status: 200,
                body: {
                    version: appVersion,
                },
            }),

            getHealth: async () => ({
                status: 200,
                body: {
                    status: 'OK',
                },
            }),
        });
    }
}
