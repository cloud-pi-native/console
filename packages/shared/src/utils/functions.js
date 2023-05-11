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
