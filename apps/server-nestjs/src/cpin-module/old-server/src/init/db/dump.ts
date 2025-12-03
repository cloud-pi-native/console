// @ts-nocheck

/**
 * How to use ?
 * npx vite-node src/init/db/dump.ts
 * format ./data.ts with linter
 * cut/paste to packages/test-utils/src/imports/data.ts
 */

import { writeFileSync } from 'node:fs'
import { Prisma } from '@prisma/client'
import { associations, manyToManyRelation, modelKeys, models, resourceListToDict } from './utils.js'
import prisma from '@old-server/prisma.js'

const Models = resourceListToDict(Prisma.dmmf.datamodel.models)

for (const modelKey of modelKeys) {
  const modelDatas = await prisma[modelKey].findMany()
  models[modelKey] = modelDatas
}
for (const [model, targetModel, relationKey] of manyToManyRelation) {
  const modelKey = model.slice(0, 1).toLocaleLowerCase() + model.slice(1)
  const modelDatas = await prisma[modelKey].findMany({ select: { [Models[model].id]: true, [relationKey]: { select: { [Models[targetModel].id]: true } } } })
  associations.push([modelKey, modelDatas])
}
const a = JSON.stringify({ ...models, associations }, null, 2)

writeFileSync('./data.ts', `export const data = ${a}`)
