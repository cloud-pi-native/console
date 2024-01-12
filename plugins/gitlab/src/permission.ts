import type { MemberSchema } from '@gitbeaker/rest'
import { AccessLevel } from '@gitbeaker/core'
import { getApi } from './utils.js'

export const getGroupMembers = async (groupId: number) => {
  const api = getApi()
  return api.GroupMembers.all(groupId)
}

type AccessLevelAllowed = AccessLevel.NO_ACCESS | AccessLevel.MINIMAL_ACCESS | AccessLevel.GUEST | AccessLevel.REPORTER | AccessLevel.DEVELOPER | AccessLevel.MAINTAINER | AccessLevel.OWNER
export const addGroupMember = async (groupId: number, userId: number, accessLevel: AccessLevelAllowed = AccessLevel.DEVELOPER): Promise<MemberSchema> => {
  const api = getApi()
  return api.GroupMembers.add(groupId, userId, accessLevel)
}
export const removeGroupMember = async (groupId: number, userId: number) => {
  const api = getApi()
  return api.GroupMembers.remove(groupId, userId)
}
