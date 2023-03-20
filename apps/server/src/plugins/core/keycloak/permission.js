import { getGroups } from './group.js'

export const getMembers = async (kcClient, groupName) => {
  const allGroups = await getGroups()
  const { id } = allGroups.find((group) => groupName === group.name)
  return kcClient.groups.listMembers({ id })
}

/**
 * Function delete an array of userId from a groupId
 *
 * @param {Array<String>} usersId - An array of keycloak user ID
 * @param {String} groupId - A keycloak group ID
 * @return {Promise} Return a Promise
 */
export const removeMembers = async (kcClient, usersId, groupId) => {
  return Promise.all(usersId.map(userId => (kcClient.users.delFromGroup({ id: userId, groupId }))))
}

/**
 * Function add an array of userId to a groupId
 *
 * @param {Array<String>} usersId - An array of keycloak user ID
 * @param {String} groupId - A keycloak group ID
 * @return {Promise} Return a Promise
 */
export const addMembers = async (kcClient, usersId, groupId) => {
  return Promise.all(usersId.map(userId => (kcClient.users.addToGroup({ id: userId, groupId }))))
}
