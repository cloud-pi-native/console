import type { Prisma, SystemSetting } from '@prisma/client'
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

export async function getSystemSettings(where?: Prisma.SystemSettingWhereInput) {
  const res = await prisma.systemSetting.findMany({ where })
  if (res === undefined || typeof res != 'object') {
    return {}
  } else {
    return res.reduce((acc, curr) => {
      return {
        ...acc,
        [curr.key]: curr.value,
      }
    }, {})
  }
}
