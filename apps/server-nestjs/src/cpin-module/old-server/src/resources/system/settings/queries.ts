import prisma from '@old-server/prisma.js';
import type { Prisma, SystemSetting } from '@prisma/client';

export function upsertSystemSetting(newSystemSetting: SystemSetting) {
    return prisma.systemSetting.upsert({
        create: {
            ...newSystemSetting,
        },
        update: {
            value: newSystemSetting.value,
        },
        where: {
            key: newSystemSetting.key,
        },
    });
}

export const getSystemSettings = (where?: Prisma.SystemSettingWhereInput) =>
    prisma.systemSetting.findMany({ where });
