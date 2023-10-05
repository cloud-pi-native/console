/**
 * @param {*} value Value wanted to be return as is
 * @returns {*} Value returned as is
 */
export const identity = (value) => value

export const getLongestStringOfArray = (array) => array.reduce((acc, curr) => acc.length < curr.length ? curr : acc, '')

export const calcProjectNameMaxLength = (organizationName) => {
  const longestEnvironmentName = 11
  return organizationName
    ? 61 - longestEnvironmentName - organizationName.length
    : 61 - longestEnvironmentName
}

export const getUniqueListBy = (arr, key) => [...new Map(arr.map(item => [item[key], item])).values()]
interface Keyable {
  [key: string]: any
}

// TODO: (#536) change 'sort' to 'toSorted' with Nodejs v20
export const sortArrByObjKeyAsc = (arr: Array<Keyable>, key: string) => arr.slice().sort((a: object, b: object) => a[key] >= b[key] ? 1 : -1)

export const removeTrailingSlash = (url: string) => url?.endsWith('/')
  ? url?.slice(0, -1)
  : url
