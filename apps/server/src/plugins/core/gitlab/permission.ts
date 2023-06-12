import { api } from './utils.js'

type AccessLevel = 0 | 5 | 10 | 20 | 30 | 40 | 50;

export const addGroupMember = async (groupId, userId, accessLevel: AccessLevel = 30) => {
  return api.GroupMembers.add(groupId, userId, accessLevel)
}
