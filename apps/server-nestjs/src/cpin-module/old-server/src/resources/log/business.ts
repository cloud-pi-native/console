import type { logContract } from '@cpn-console/shared';
import { CleanLogSchema } from '@cpn-console/shared';
import { getAllLogs } from '@old-server/resources/queries-index.js';

export async function getLogs({
    offset,
    limit,
    projectId,
    clean,
}: typeof logContract.getLogs.query._type) {
    const [total, logs] = await getAllLogs({
        skip: offset,
        take: limit,
        where: { projectId },
    });
    return [total, clean ? logs.map((log) => CleanLogSchema.parse(log)) : logs];
}
