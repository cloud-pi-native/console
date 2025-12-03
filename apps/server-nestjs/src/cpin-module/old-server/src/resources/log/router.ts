import type { CleanLog, Log, XOR } from '@cpn-console/shared';
import { AdminAuthorized, logContract } from '@cpn-console/shared';
import { serverInstance } from '@old-server/app.js';
import type {
    UserProfile,
    UserProjectProfile,
} from '@old-server/utils/controller.js';
import { authUser } from '@old-server/utils/controller.js';
import { Forbidden403 } from '@old-server/utils/errors.js';

import { getLogs } from './business.js';

export function logRouter() {
    return serverInstance.router(logContract, {
        // Récupérer des logs
        getLogs: async ({ request: req, query }) => {
            const perms: XOR<UserProfile, UserProjectProfile> = query.projectId
                ? await authUser(req, { id: query.projectId })
                : await authUser(req);

            if (!AdminAuthorized.isAdmin(perms.adminPermissions)) {
                if (!perms.projectPermissions) {
                    return new Forbidden403();
                }
                query.clean = true;
            }

            const [total, logs] = (await getLogs(query)) as [
                number,
                unknown[],
            ] as [number, Array<Log | (CleanLog & { data: Log['data'] })>];

            return {
                status: 200,
                body: { total, logs },
            };
        },
    });
}
