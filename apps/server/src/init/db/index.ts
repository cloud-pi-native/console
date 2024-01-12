import { dropTables } from '@/connect.js'
import prisma from '@/prisma.js'
import { objectEntries } from '@dso-console/shared'

type Models = 'cluster' | 'environment' | 'log' | 'organization' | 'permission' | 'project' | 'repository' | 'role' | 'user' | 'stage' | 'quota'

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
  for (const model of Object.keys(data)) {
    if (model === 'associates') continue
    for (let value of data[model]) {
      try {
        // Format for one-to-one relation
        value = Object.fromEntries(Object.entries(value).map(([key, value]) => {
          return [key, !Object.keys(prisma).includes(key) || model === key
            ? value
            : { create: value }]
        }))
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
