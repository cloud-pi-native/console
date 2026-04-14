import type { Context } from 'alchemy'
import type { GitlabClient } from './client.js'
import type { SimpleUserSchema } from './types.js'
import { Resource } from 'alchemy'

export interface GitlabUserProps {
  client: GitlabClient
  email: string
  username: string
  name: string
  externUid?: string
  provider?: string
  isAdmin?: boolean
  isAuditor?: boolean
}

export type GitlabUserOutput = Resource<'gitlab:User'> & SimpleUserSchema

export const GitlabUser = Resource('gitlab:User', async function (
  this: Context<GitlabUserOutput, GitlabUserProps>,
  _id: string,
  props: GitlabUserProps,
) {
  if (this.phase === 'create') {
    const existing = await props.client.usersAll({ username: props.username }).then(res => res.data[0])
    if (existing) {
      if (props.isAdmin !== undefined && props.isAuditor !== undefined) {
        await props.client.usersEdit(existing.id, { admin: props.isAdmin, auditor: props.isAuditor, canCreateGroup: props.isAdmin })
      }
      return this.create(existing)
    }
    const user = await props.client.usersCreate({
      email: props.email,
      username: props.username,
      name: props.name,
      externUid: props.externUid,
      provider: props.provider,
      password: Math.random().toString(36).slice(-8),
      skipConfirmation: true,
      admin: props.isAdmin ?? false,
      auditor: props.isAuditor ?? false,
      canCreateGroup: props.isAdmin ?? false,
    })
    return this.create(user)
  } else if (this.phase === 'update') {
    if (props.isAdmin !== undefined && props.isAuditor !== undefined) {
      await props.client.usersEdit(this.output.id, { admin: props.isAdmin, auditor: props.isAuditor, canCreateGroup: props.isAdmin })
    }
    return this.create(this.output)
  } else if (this.phase === 'delete') {
    return this.destroy()
  }
  throw new Error('Unexpected phase')
})
