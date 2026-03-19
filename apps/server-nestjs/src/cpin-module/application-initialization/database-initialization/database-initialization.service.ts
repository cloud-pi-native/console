import { Inject, Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../infrastructure/database/prisma.service'

import { modelKeys } from './utils'

type ModelKey = (typeof modelKeys)[number]
type Imports = Partial<Record<ModelKey, object[]>> & {
  associations: [ModelKey, any[]][]
}

@Injectable()
export class DatabaseInitializationService {
  private readonly loggerService = new Logger(
    DatabaseInitializationService.name,
  )

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async initDb(data: Imports) {
    const dataStringified = JSON.stringify(data)
    const dataParsed = JSON.parse(dataStringified, (key, value) => {
      try {
        if (['permissions', 'everyonePerms'].includes(key)) {
          return BigInt(value.slice(0, value.length - 1))
        }
      } catch {
        return value
      }
      return value
    })
    this.loggerService.log('Drop tables')
    for (const modelKey of modelKeys.toReversed()) {
      // @ts-ignore
      await prisma[modelKey].deleteMany()
    }
    this.loggerService.log('Import models')
    for (const modelKey of modelKeys) {
      // @ts-ignore
      await prisma[modelKey].createMany({ data: dataParsed[modelKey] })
    }
    this.loggerService.log('Import associations')
    for (const [modelKey, rows] of dataParsed.associations) {
      for (const row of rows) {
        const idKey = 'id'
        const connectKeys = Object.keys(row).filter(
          key => key !== idKey,
        )
        const dataConnects = connectKeys.reduce(
          (acc, curr) => {
            acc[curr] = { connect: row[curr] }
            return acc
          },
          {} as Record<string, { connect: any[] }>,
        )
        // @ts-ignore
        await prisma[modelKey].update({
          where: { id: row.id },
          data: dataConnects,
        })
      }
    }
    this.loggerService.log('End import')
  }
}
