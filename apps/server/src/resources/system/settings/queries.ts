import type { SystemSetting, UpsertSystemSettingBody } from '@cpn-console/shared'
import prisma from '@/prisma.js'

export const upsertSystemSetting = async (newSystemSetting: UpsertSystemSettingBody) => {
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

export const getSystemSettings = () => prisma.systemSetting.findMany()

export const getSystemSetting = (key: SystemSetting['key']) => prisma.systemSetting.findUniqueOrThrow({
  where: {
    key,
  },
})
