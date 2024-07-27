import { longestEnvironmentName } from './const.js'
import { ResourceById } from './types.js'

/**
 * @param {*} value Value wanted to be return as is
 * @returns {*} Value returned as is
 */
export const identity = (value: unknown) => value

export const getLongestStringOfArray = (array: Array<string>) => array.reduce((acc, curr) => acc.length < curr.length ? curr : acc, '')

export const calcProjectNameMaxLength = (organizationName: string) => {
  return organizationName
    ? 61 - longestEnvironmentName - organizationName.length
    : 61 - longestEnvironmentName
}

export const getUniqueListBy = (arr: Array<Record<string, unknown>>, key: string) => [...new Map(arr.map(item => [item[key], item])).values()]

export const isString = (value: any): value is string => typeof value === 'string' || value instanceof String

type ObjToSort = Record<string, unknown>

export const sortArrByObjKeyAsc = <T extends ObjToSort[]>(arr: T, key: string): T => {
  return arr.toSorted((a: ObjToSort, b: ObjToSort) => {
    const aValue = a[key]
    const bValue = b[key]
    if (isString(aValue) && isString(bValue)) {
      return aValue.localeCompare(bValue.toString(), 'fr', { sensitivity: 'base' })
    }
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return aValue - bValue
    }
    if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
      return Number(bValue) - Number(aValue)
    }
    return -1
  }) as T
}

export const removeTrailingSlash = (url: string) => url?.endsWith('/')
  ? url.slice(0, -1)
  : url

// Exclude keys from an object
export const exclude = <T>(result: T, keys: string[]): T => {
  // @ts-ignore
  if (Array.isArray(result)) return result.map(item => exclude(item, keys))
  const newObj: Record<string, unknown> = {}
  // @ts-ignore
  Object.entries(result).forEach(([key, value]) => {
    if (keys.includes(key)) return
    if (Array.isArray(value) && typeof value[0] === 'string') {
      newObj[key] = value
      return
    }
    if (Array.isArray(value)) {
      newObj[key] = value.map(val => exclude(val, keys))
      return
    }
    if (value instanceof Object) {
      newObj[key] = exclude(value, keys)
      return
    }
    newObj[key] = value
  })
  // @ts-ignore
  return newObj
}

export type AsyncReturnType<T extends (...args: any) => Promise<any>> =
  T extends (...args: any) => Promise<infer R> ? R : any

export const objectEntries = <Obj extends Record<string, unknown>>(obj: Obj): ([keyof Obj, Obj[keyof Obj]])[] => {
  return Object.entries(obj) as ([keyof Obj, Obj[keyof Obj]])[]
}
export const objectKeys = <Obj extends Record<string, unknown>>(obj: Obj): (keyof Obj)[] => {
  return Object.keys(obj) as (keyof Obj)[]
}
export const objectValues = <Obj extends Record<string, unknown>>(obj: Obj): (Obj[keyof Obj])[] => {
  return Object.values(obj) as (Obj[keyof Obj])[]
}

export const requiredEnv = (envName: string): string => {
  const envValue = process.env[envName]
  if (envValue) return envValue

  throw Error(`env: ${envName} is not defined !`)
}

export const resourceListToDict = <T extends { id: string }>(resList: Array<T>): ResourceById<T> => resList.reduce((acc, curr) => {
  return {
    ...acc,
    [curr.id]: curr,
  }
}, {} as ResourceById<T>)
