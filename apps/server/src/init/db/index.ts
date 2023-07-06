import { dropTables } from '../../connect.js'
import { exclude } from '../../utils/queries-tools.js'
import prisma from '@/prisma.js'

export const initDb = async (data) => {
  await dropTables()

  const tables = Object.keys(data)

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
  for (const sourceModel of Object.keys(data.associates)) {
    for (const associationsModel of Object.values(data.associates[sourceModel])) {
      for (const associationModel of associationsModel) {
        for (const [targetModel, values] of Object.entries(associationModel)) {
          if (targetModel === 'id') continue
          for (const value of values) {
            console.log(sourceModel, targetModel, associationModel.id, '=>', value.id)
            await prisma[sourceModel].update({
              where: {
                id: associationModel.id,
              },
              data: {
                [targetModel]: {
                  connect: {
                    id: value.id,
                  },
                },
              },
            })
          }
        }
      }
    }
  }
}
