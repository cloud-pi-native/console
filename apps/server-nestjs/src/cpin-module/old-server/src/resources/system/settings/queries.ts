import type { Prisma, SystemSetting } from '@prisma/client'
import prisma from '@old-server/prisma'

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
  })
}

export const getSystemSettings = (where?: Prisma.SystemSettingWhereInput) => prisma.systemSetting.findMany({ where })
