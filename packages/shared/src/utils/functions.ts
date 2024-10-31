import { longestEnvironmentName } from './const.js'
import type { ResourceById, ResourceByKey } from './types.js'

/**
 * @param {*} value Value wanted to be return as is
 * @returns {*} Value returned as is
 */
export const identity = (value: unknown) => value

export const getLongestStringOfArray = (array: Array<string>) => array.reduce((acc, curr) => acc.length < curr.length ? curr : acc, '')

export function calcProjectNameMaxLength(organizationName: string) {
  return organizationName
    ? 61 - longestEnvironmentName - organizationName.length
    : 61 - longestEnvironmentName
}

export const getUniqueListBy = (arr: Array<Record<string, unknown>>, key: string) => [...new Map(arr.map(item => [item[key], item])).values()]

export const isString = (value: any): value is string => typeof value === 'string' || value instanceof String

type ObjToSort = Record<string, unknown>

export function sortArrByObjKeyAsc<T extends ObjToSort[]>(arr: T, key: string): T {
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

export function removeTrailingSlash(url: string) {
  return url?.endsWith('/')
    ? url.slice(0, -1)
    : url
}

// Exclude keys from an object
export function exclude<T>(result: T, keys: string[]): T {
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

export function objectEntries<Obj extends Record<string, unknown>>(obj: Obj): ([keyof Obj, Obj[keyof Obj]])[] {
  return Object.entries(obj) as ([keyof Obj, Obj[keyof Obj]])[]
}
export function objectKeys<Obj extends Record<string, unknown>>(obj: Obj): (keyof Obj)[] {
  return Object.keys(obj) as (keyof Obj)[]
}
export function objectValues<Obj extends Record<string, unknown>>(obj: Obj): (Obj[keyof Obj])[] {
  return Object.values(obj) as (Obj[keyof Obj])[]
}

export function requiredEnv(envName: string): string {
  const envValue = process.env[envName]
  if (envValue) return envValue

  throw new Error(`env: ${envName} is not defined !`)
}

export function resourceListToDict<T extends { id: string }>(resList: Array<T>): ResourceById<T> {
  return resList.reduce((acc, curr) => {
    return {
      ...acc,
      [curr.id]: curr,
    }
  }, {} as ResourceById<T>)
}

export function resourceListToDictByKey<T extends { key: string }>(resList: Array<T>): ResourceByKey<T> {
  return resList.reduce((acc, curr) => {
    return {
      ...acc,
      [curr.key]: curr,
    }
  }, {} as ResourceByKey<T>)
}

export function shallowEqual(object1: Record<string, unknown>, object2: Record<string, unknown>) {
  const keys1 = Object.keys(object1)
  const keys2 = Object.keys(object2)

  if (keys1.length !== keys2.length) {
    return false
  }

  for (const key of keys1) {
    if (object1[key] !== object2[key]) {
      return false
    }
  }

  return true
}

/**
 * Check if all the keys / values in first parameter is present in the the second parameter, the second one can have additional property
 *
 * @example
 * ```ts
 * shallowMatch({ a: 'a' }, { a: 'c' })         // false, invalid value
 * shallowMatch({ a: 'a' }, { })                // fals, missing property
 * shallowMatch({ a: 'a' }, { a: 'a', b: 'b' }) // true, everything is retrieved and equivalent in the second argument
 * ```
 *
 */
export function shallowMatch(objectController: Record<string, unknown> | undefined, objectToCheck: Record<string, unknown> | undefined) {
  if (!objectController || !objectToCheck) {
    return false
  }

  const keys1 = Object.keys(objectController)
  const keys2 = Object.keys(objectToCheck)

  if (keys1.length > keys2.length) {
    return false
  }

  for (const key of keys1) {
    if (objectController[key] !== objectToCheck[key]) {
      return false
    }
  }

  return true
}

export function generateRandomPassword(length = 24, chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@-_#*') {
  return Array.from(crypto.getRandomValues(new Uint32Array(length)))
    .map(x => chars[x % chars.length])
    .join('')
}

export function isAtLeastTomorrow(actualTime: Date) {
  const tomorrow = new Date(Date.now())
  tomorrow.setUTCHours(23, 59, 59, 999)

  return actualTime.getTime() > tomorrow.getTime()
}

export function insert<T>(pseudoArray: T[] | undefined, element: T): T[] {
  if (!pseudoArray) {
    return [element]
  } else if (Array.isArray(pseudoArray)) {
    return [...pseudoArray, element]
  } else {
    throw new TypeError('item is not an ArrayLike')
  }
}
