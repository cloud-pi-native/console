import { kcClient } from './index.js'
import { getGroups } from './group.js'

export const getMembers = async (groupName) => {
  const allGroups = await getGroups()
  const { id } = allGroups.find((group) => groupName === group.name)
  return kcClient.groups.listMembers({ id })
}

export const removeMembers = async (usersId, groupsName) => {
  const allGroups = await getGroups()
  const groups = allGroups.filter((group) => groupsName.includes(group.name))
  const prms = groups.flatMap((group) => (usersId.map((id) => kcClient.users.delFromGroup({ id, groupId: group.id }))))
  return Promise.all(prms)
}

export const addMembers = async (usersId, groupsName) => {
  const allGroups = await getGroups()
  const groups = allGroups.filter((group) => groupsName.includes(group.name))
  const prms = groups.flatMap((group) => (usersId.map((id) => kcClient.users.addToGroup({ id, groupId: group.id }))))
  return Promise.all(prms)
}
