import { allEnv } from './const.js'

/**
 * @param {*} value Value wanted to be return as is
 * @returns {*} Value returned as is
 */
export const identity = (value) => value

export const getLongestStringOfArray = (array) => array.reduce((acc, curr) => acc.length < curr.length ? curr : acc, '')

export const calcProjectNameMaxLength = (organizationName) => {
  const longestEnvironmentName = getLongestStringOfArray(allEnv)
  return organizationName
    ? 61 - longestEnvironmentName.length - organizationName.length
    : 61 - longestEnvironmentName.length
}

export const getUniqueListBy = (arr, key) => [...new Map(arr.map(item => [item[key], item])).values()]

interface Keyable {
    [key: string]: any
}

export const sortArrByObjKeyAsc = (arr: Array<Keyable>, key: string) => arr.toSorted((a: object, b: object) => a[key] >= b[key] ? 1 : -1)
