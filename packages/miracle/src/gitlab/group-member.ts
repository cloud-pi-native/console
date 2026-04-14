import type { Context } from 'alchemy'
import type { GitlabClient } from './client.js'
import type { MemberSchema } from './types.js'
import { Resource } from 'alchemy'

export interface GitlabGroupMemberProps {
  client: GitlabClient
  groupId: number
  userId: number
  accessLevel: number
}

export interface GitlabGroupMemberState {
  groupId: number
  userId: number
  accessLevel: number
}

export type GitlabGroupMemberOutput = Resource<'gitlab:GroupMember'> & GitlabGroupMemberState

export const GitlabGroupMember = Resource('gitlab:GroupMember', async function (
  this: Context<GitlabGroupMemberOutput, GitlabGroupMemberProps>,
  _id: string,
  props: GitlabGroupMemberProps,
) {
  if (this.phase === 'create') {
    const members = await props.client.groupMembersAll(props.groupId)
    const existing = members.data.find((m: MemberSchema) => m.id === props.userId)
    if (existing) {
      const existingAccessLevel = existing.access_level ?? existing.accessLevel
      if (existingAccessLevel !== props.accessLevel) {
        await props.client.groupMembersEdit(props.groupId, props.userId, props.accessLevel)
      }
    } else {
      await props.client.groupMembersAdd(props.groupId, props.userId, props.accessLevel)
    }
    return this.create({ groupId: props.groupId, userId: props.userId, accessLevel: props.accessLevel })
  } else if (this.phase === 'update') {
    if (this.output.accessLevel !== props.accessLevel) {
      await props.client.groupMembersEdit(props.groupId, props.userId, props.accessLevel)
    }
    return this.create({ groupId: props.groupId, userId: props.userId, accessLevel: props.accessLevel })
  } else if (this.phase === 'delete') {
    return this.destroy()
  }
  throw new Error('Unexpected phase')
})
