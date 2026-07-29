import type { Prisma, SystemSetting } from '@prisma/client'
import prisma from '@/prisma.js'

export async function upsertSystemSetting(newSystemSetting: SystemSetting) {
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

export const getSystemSettings = async (where?: Prisma.SystemSettingWhereInput) => prisma.systemSetting.findMany({ where })
