import { api } from './utils.js'

export const addGroupMember = async (groupId, userId, accessLevel = 30) => {
  return api.GroupMembers.add(groupId, userId, accessLevel)
}
