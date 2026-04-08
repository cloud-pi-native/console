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

/**
 * Exclude keys from an object (trampoline-style iterative deep clone)
 * Uses an explicit stack instead of native recursion to avoid call-stack limits
 * on very large/deep objects. Traverses arrays & plain objects, skips keys in
 * the provided blacklist, and preserves string arrays without further descent.
 */
export function exclude<T>(result: T, keys: string[]): T {
  const root: unknown[] = []
  const stack: {
    value: unknown
    parent: Record<string, unknown> | unknown[]
    key?: string | number
  }[] = [{ value: result, parent: root, key: 0 }]

  while (stack.length) {
    const { value, parent, key } = stack.pop()!
    if (Array.isArray(value)) {
      const arr: unknown[] = []
      if (parent === root) {
        root.push(arr)
      } else if (Array.isArray(parent)) {
        parent[key as number] = arr
      } else if (parent && typeof key === 'string') {
        ;(parent as Record<string, unknown>)[key] = arr
      }
      for (let i = value.length - 1; i >= 0; i--) {
        stack.push({ value: value[i], parent: arr, key: i })
      }
    } else if (value && typeof value === 'object') {
      const obj: Record<string, unknown> = {}
      if (parent === root) {
        root.push(obj)
      } else if (Array.isArray(parent)) {
        parent[key as number] = obj
      } else if (parent && typeof key === 'string') {
        ;(parent as Record<string, unknown>)[key] = obj
      }
      const entries = Object.entries(value).filter(([k]) => !keys.includes(k))
      for (let i = entries.length - 1; i >= 0; i--) {
        const [k, v] = entries[i]
        if (Array.isArray(v) && typeof v[0] === 'string') {
          obj[k] = v
        } else {
          stack.push({ value: v, parent: obj, key: k })
        }
      }
    } else {
      if (parent === root) {
        root.push(value)
      } else if (Array.isArray(parent)) {
        parent[key as number] = value
      } else if (parent && typeof key === 'string') {
        ;(parent as Record<string, unknown>)[key] = value
      }
    }
  }
  return (Array.isArray(result) ? root[0] : root[0]) as T
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
