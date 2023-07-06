import { dropTables } from '../../connect.js'
import { exclude } from '../../utils/queries-tools.js'
import prisma from '@/prisma.js'

export const initDb = async (data) => {
  await dropTables()

  for (const model of Object.keys(data)) {
    if (model === 'associates') continue
    for (const value of data[model]) {
      try {
        await prisma[model].create({
          data: value,
        })
      } catch (error) {
        console.log({ error, model })
      }
    }
  }
  if (!data.associates) return
  for (const [sourceModel, associations] of Object.entries(data.associates)) {
    for (const association of associations) {
      for (const [targetModel, targetIds] of Object.entries(association)) {
        await prisma[sourceModel].update({
          where: {
            id: association.id,
          },
          data: {
            [targetModel]: {
              set: targetIds,
            },
          },
        })
      }
    }
  }
}
