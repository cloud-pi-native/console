import app from '../../app.js'
import prisma from '@/prisma.js'
import { modelKeys } from './utils.js'

type ExtractKeysWithFields<T> = {
  [K in keyof T]: T[K] extends { fields: any } ? K : never
}[keyof T]

type Models = ExtractKeysWithFields<typeof prisma>

type Imports = Partial<Record<Models, object[]>> & {
  associations: [Models, any[]]
}

export const initDb = async (data: Imports) => {
  app.log.info('Drop tables')
  for (const modelKey of modelKeys.toReversed()) {
    // @ts-ignore
    await prisma[modelKey].deleteMany()
  }
  app.log.info('Import models')
  for (const modelKey of modelKeys) {
    // @ts-ignore
    await prisma[modelKey].createMany({ data: data[modelKey] })
  }
  app.log.info('Import associations')
  for (const [modelKey, rows] of data.associations) {
    for (const row of rows) {
      const idKey = 'id'
      const connectKeys = Object.keys(row).filter(key => key !== idKey)
      const data = connectKeys.reduce((acc, curr) => {
        acc[curr] = { connect: row[curr] }
        return acc
      }, {} as Record<string, { connect: any[] }>)
      // @ts-ignore
      await prisma[modelKey].update({ where: { id: row.id }, data })
    }
  }
  app.log.info('End import')
}
