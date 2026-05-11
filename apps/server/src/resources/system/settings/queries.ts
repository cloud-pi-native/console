import type { Prisma, SystemSetting } from '@cpn-console/database'
import prisma from '@/prisma.js'

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
