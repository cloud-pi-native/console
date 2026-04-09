import type { ResourceById, ResourceByKey } from './types.js'
import shortUUID from 'short-uuid'
import { longestEnvironmentName } from './const.js'

/**
 * @param {*} value Value wanted to be return as is
 * @returns {*} Value returned as is
 */
export const identity = (value: unknown) => value

export const getLongestStringOfArray = (array: Array<string>) => array.reduce((acc, curr) => acc.length < curr.length ? curr : acc, '')

export function calcProjectNameMaxLength() {
  return 61 - longestEnvironmentName
}

export const getUniqueListBy = (arr: Array<Record<string, unknown>>, key: string) => [...new Map(arr.map(item => [item[key], item])).values()]

export const isString = (value: any): value is string => typeof value === 'string'

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

function excludeCircular(value: unknown, keys: string[], inPath: WeakSet<object>, inArray: boolean): unknown {
  if (value === null) return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'undefined') return inArray ? null : undefined
  if (typeof value === 'function') return inArray ? null : undefined
  if (typeof value === 'symbol') return value.toString()
  if (typeof value === 'object') {
    if (inPath.has(value)) return '[Circular]'
    inPath.add(value)

    if (Array.isArray(value)) return value.map(v => excludeCircular(v, keys, inPath, true))

    if (value instanceof Date) {
      inPath.delete(value)
      return value.toISOString()
    }

    if (value instanceof Error) {
      const payload = {
        name: value.name,
        message: value.message,
        stack: value.stack,
      }
      inPath.delete(value)
      try {
        return JSON.stringify(payload)
      } catch {
        return `${value.name}: ${value.message}`
      }
    }

    if (value instanceof Map) {
      const obj: Record<string, unknown> = {}
      for (const [k, v] of value.entries()) {
        const key = typeof k === 'string' ? k : String(k)
        obj[key] = excludeCircular(v, keys, inPath, false)
      }
      inPath.delete(value)
      return obj
    }

    if (value instanceof Set) {
      const out = Array.from(value.values(), v => excludeCircular(v, keys, inPath, true))
      inPath.delete(value)
      return out
    }

    if (value instanceof RegExp) {
      inPath.delete(value)
      return value.toString()
    }

    if (value instanceof URL) {
      inPath.delete(value)
      return value.toString()
    }

    if (value instanceof URLSearchParams) {
      inPath.delete(value)
      return value.toString()
    }

    if ('toJSON' in value && typeof value.toJSON === 'function') {
      try {
        const serialized = value.toJSON()
        const out = excludeCircular(serialized, keys, inPath, inArray)
        inPath.delete(value)
        return out
      } catch {
        inPath.delete(value)
        return '[Unserializable]'
      }
    }

    const proto = Object.getPrototypeOf(value)
    if (proto !== Object.prototype && proto !== null) {
      const ctorName = (value as any)?.constructor?.name
      const tag = typeof ctorName === 'string' && ctorName.length ? ctorName : 'Object'
      try {
        const s = String(value)
        const out = s === '[object Object]' ? `[${tag}]` : s
        inPath.delete(value)
        return out
      } catch {
        inPath.delete(value)
        return `[${tag}]`
      }
    }

    const obj = value as Record<string, unknown>
    const newObj: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) {
      if (keys.includes(k)) continue
      const next = excludeCircular(v, keys, inPath, false)
      if (typeof next === 'undefined') continue
      newObj[k] = next
    }
    inPath.delete(value)
    return newObj
  }
  return String(value)
}

// Exclude keys from an object
export function exclude<T>(result: T, keys: string[]): T {
  const inPath = new WeakSet<object>()
  return excludeCircular(result, keys, inPath, false) as T
}

export type AsyncReturnType<T extends (...args: any) => Promise<any>>
  = T extends (...args: any) => Promise<infer R> ? R : any

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
  const definedObject1 = Object.fromEntries(
    Object.entries(object1).filter(([_, v]) => v !== undefined),
  )
  const definedObject2 = Object.fromEntries(
    Object.entries(object2).filter(([_, v]) => v !== undefined),
  )
  const keys1 = Object.keys(definedObject1)
  const keys2 = Object.keys(definedObject2)

  if (keys1.length !== keys2.length) {
    return false
  }

  for (const key of keys1) {
    if (definedObject1[key] !== definedObject2[key]) {
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
  return Array.from(crypto.getRandomValues(new Uint32Array(length)), x => chars[x % chars.length])
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

export type ArrayElement<ArrayType extends readonly unknown[]>
  = ArrayType extends readonly (infer ElementType)[] ? ElementType : never

export const bts = (v: boolean) => v ? 'true' : 'false'
export function stb(v?: string | undefined) {
  return v === 'true'
    ? true
    : v === 'false' ? false : undefined
}

const uuidTranslator = shortUUID(shortUUID.constants.uuid25Base36, {
  consistentLength: false,
})

export const compressUUID = uuidTranslator.fromUUID
export const expandUUID = uuidTranslator.toUUID

export function generateNamespaceName(projectId: string, envId: string) {
  return `${compressUUID(envId)}--${compressUUID(projectId)}`
}
