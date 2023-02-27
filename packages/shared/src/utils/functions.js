import { allOrganizations, allEnv } from '../utils/iterables.js'

/**
 * @param {*} value Value wanted to be return as is
 * @returns {*} Value returned as is
 */
export const identity = (value) => value

export const getLongestStringOfArray = (array) => array.reduce((acc, curr) => acc.length < curr.length ? curr : acc, '')

const longestOrganizationName = getLongestStringOfArray(allOrganizations.map(organization => organization.name))
const longestEnvironmentName = getLongestStringOfArray(allEnv)
export const projectNameMaxLength = 61 - longestOrganizationName.length - longestEnvironmentName.length
