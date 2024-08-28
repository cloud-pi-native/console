// @ts-nocheck
import { Prisma } from '@prisma/client'

// eslint-disable-next-line no-extend-native
BigInt.prototype.toJSON = function () {
  return `${this.toString()}n`
}

export type ResourceByName<T extends {
  name: string
}> = Record<T['name'], T>
export function resourceListToDict<T extends { name: string }>(resList: Array<T>): ResourceByName<T & { id?: string }> {
  return resList.reduce((acc, curr) => {
    return {
      ...acc,
      [curr.name]: curr,
    }
  }, {} as ResourceByName<T & { id?: string }>)
}

// @ts-ignore
const Models = resourceListToDict(Prisma.dmmf.datamodel.models)
let ModelsNames = Object.keys(Models)
let ModelsOrder = [...ModelsNames]

export function moveBefore<T extends string[]>(arr: T, toMove: T[number], ref: T[number]): T | false {
  const iref = arr.indexOf(ref)
  const moveref = arr.indexOf(toMove)
  if (moveref <= iref) return false
  return [
    ...arr.slice(0, iref),
    arr[moveref],
    ...arr.slice(iref, moveref),
    ...arr.slice(moveref + 1),
  ] as T
}

export const manyToManyRelation: [string, string, string][] = []
function sort() {
  let hasChanged = false
  for (const model of ModelsNames) {
    for (const field of Models[model].fields) {
      if (field.isId) Models[model].id = field.name
      if (field.type in Models) {
        const relationField = Models[field.type].fields.find(({ type }) => type === model)
        if (!relationField) throw new Error('unable to find matching model')
        if (
          (relationField.isRequired && field.isRequired && !relationField.isList)
          || (relationField.isRequired && !field.isRequired)
        ) {
          const moveRes = moveBefore(ModelsOrder, model, field.type)
          if (moveRes) {
            hasChanged = true
            ModelsOrder = moveRes
          }
        }
        if (
          field.isList && relationField.isList
          && !manyToManyRelation.find(test =>
            (test[0] === model && test[1] === field.type) || (test[0] === field.type && test[1] === model))
        ) {
          manyToManyRelation.push([model, field.type, field.name])
        }
      }
    }
  }
  ModelsNames = ModelsOrder
  if (hasChanged) sort()
}

sort()
export const models: Record<string, any[]> = {}
export const associations: Record<string, any[]> = []
export const modelKeys = ModelsOrder.map(model => model.slice(0, 1).toLocaleLowerCase() + model.slice(1))
