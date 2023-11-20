import type { AccessLevel, MemberSchema } from '@gitbeaker/rest'
import { api } from './utils.js'

export const getGroupMembers = async (groupId: number) => api.GroupMembers.all(groupId)

export const addGroupMember = async (groupId: number, userId: number, accessLevel: AccessLevel = 30): Promise<MemberSchema> => api.GroupMembers.add(groupId, userId, accessLevel)

export const removeGroupMember = async (groupId: number, userId: number) => api.GroupMembers.remove(groupId, userId)
