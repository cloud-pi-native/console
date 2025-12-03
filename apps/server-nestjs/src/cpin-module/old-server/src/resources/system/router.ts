import { systemContract } from '@cpn-console/shared';
import { serverInstance } from '@old-server/app.js';
import { appVersion } from '@old-server/utils/env.js';

export function systemRouter() {
    return serverInstance.router(systemContract, {
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
