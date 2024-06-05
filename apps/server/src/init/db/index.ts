import { dropTables } from '@/connect.js'
import prisma from '@/prisma.js'
import { objectEntries, objectKeys } from '@cpn-console/shared'

type Models = 'zone' | 'cluster' | 'environment' | 'log' | 'organization' | 'permission' | 'project' | 'repository' | 'role' | 'user' | 'stage' | 'quota'

type Associates = Partial<Record<
  Models, {
    id: string,
    [k: string]: { id: string }[] | string
  }[]>
>

type Imports = Partial<Record<Models, Record<string, any>[]>> & {
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
  for (const [sourceModel, associations] of Object.entries(data.associates)) {
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
