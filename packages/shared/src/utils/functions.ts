import { longestEnvironmentName } from './const.js'

/**
 * @param {*} value Value wanted to be return as is
 * @returns {*} Value returned as is
 */
export const identity = (value) => value

export const getLongestStringOfArray = (array) => array.reduce((acc, curr) => acc.length < curr.length ? curr : acc, '')

export const calcProjectNameMaxLength = (organizationName: string) => {
  return organizationName
    ? 61 - longestEnvironmentName - organizationName.length
    : 61 - longestEnvironmentName
}

export const getUniqueListBy = (arr, key) => [...new Map(arr.map(item => [item[key], item])).values()]

export const sortArrByObjKeyAsc = (arr: Record<string, unknown>[], key: string) => arr?.toSorted((a: object, b: object) => a[key] >= b[key] ? 1 : -1)

export const removeTrailingSlash = (url: string) => url?.endsWith('/')
  ? url?.slice(0, -1)
  : url

// Exclude keys from an object
export const exclude = <T>(result: T, keys: string[]): T => {
  // @ts-ignore
  if (Array.isArray(result)) return result.map(item => exclude(item, keys))
  const newObj = {}
  Object.entries(result).forEach(([key, value]) => {
    if (keys.includes(key)) return
    if (Array.isArray(value) && typeof value[0] === 'string') {
      newObj[key] = value
      return
    }
    if (Array.isArray(value)) {
      newObj[key] = value.map((val) => exclude(val, keys))
      return
    }
    if (value instanceof Object) {
      newObj[key] = exclude(value, keys)
      return
    }
    newObj[key] = value
  })
  return newObj as any
}
