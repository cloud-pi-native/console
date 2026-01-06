import type { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service';
import type { ServerService } from '@/cpin-module/infrastructure/server/server.service';
import { systemContract } from '@cpn-console/shared';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SystemRouterService {
    constructor(
        private readonly configurationService: ConfigurationService,
        private readonly serverService: ServerService,
    ) {}

    systemRouter() {
        return this.serverService.serverInstance.router(systemContract, {
            getVersion: async () => ({
                status: 200,
                body: {
                    version: this.configurationService.appVersion,
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
