import { dropTables } from '../../connect.js'
import prisma from '@/prisma.js'

export const initDb = async (data) => {
  await dropTables()

  for (const model of Object.keys(data)) {
    for (const value of data[model]) {
      await prisma[model].create({
        data: value,
      })
    }
  }
}
