import type { AccessLevel } from '@gitbeaker/rest'
import { api } from './utils.js'

export const addGroupMember = async (groupId: number, userId: number, accessLevel: AccessLevel = 30) => api.GroupMembers.add(groupId, userId, accessLevel)
