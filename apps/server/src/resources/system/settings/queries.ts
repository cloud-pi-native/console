import prisma from '@/prisma.js'
import { Prisma, SystemSetting } from '@prisma/client'

export const upsertSystemSetting = (newSystemSetting: SystemSetting) =>
  prisma.systemSetting.upsert({
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

export const getSystemSettings = (where?: Prisma.SystemSettingWhereInput) => prisma.systemSetting.findMany({ where })
