import { dropTables } from '@/connect.js'
import prisma from '@/prisma.js'
import { objectEntries, objectKeys } from '@cpn-console/shared'

type ExtractKeysWithFields<T> = {
  [K in keyof T]: T[K] extends { fields: any } ? K : never
}[keyof T];

type Models = ExtractKeysWithFields<typeof prisma>

type Associates = Partial<Record<
  Models, {
    id: string,
    [k: string]: { id: string }[] | string
  }[]>
>

type Imports = Partial<Record<Models, object[]>> & {
  associates?: Partial<Associates>
}

export const initDb = async (data: Imports) => {
  await dropTables()
  for (const model of objectKeys(data)) {
    if (model === 'associates') continue
    // @ts-ignore
    for (const value of data[model]) {
      try {
        // @ts-ignore
        await prisma[model].create({
          data: value,
        })
      } catch (error) {
        console.log({ error, model })
      }
    }
  }
  if (!data.associates) return
  for (const [sourceModel, associations] of objectEntries(data.associates)) {
    if (!associations) continue
    for (const association of associations) {
      for (const [targetModel, targetIds] of objectEntries(association)) {
        // @ts-ignore
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
