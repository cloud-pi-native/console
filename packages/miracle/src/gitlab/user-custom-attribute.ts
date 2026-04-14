import type { Context } from 'alchemy'
import type { GitlabClient } from './client.js'
import { Resource } from 'alchemy'

export interface GitlabUserCustomAttributeProps {
  client: GitlabClient
  userId: number
  key: string
  value: string
}

export interface GitlabUserCustomAttributeState {
  userId: number
  key: string
  value: string
}

export type GitlabUserCustomAttributeOutput = Resource<'gitlab:UserCustomAttribute'> & GitlabUserCustomAttributeState

export const GitlabUserCustomAttribute = Resource('gitlab:UserCustomAttribute', async function (
  this: Context<GitlabUserCustomAttributeOutput, GitlabUserCustomAttributeProps>,
  _id: string,
  props: GitlabUserCustomAttributeProps,
) {
  if (this.phase === 'create') {
    await props.client.userCustomAttributesSet(props.userId, props.key, props.value)
    return this.create({ userId: props.userId, key: props.key, value: props.value })
  } else if (this.phase === 'update') {
    if (this.output.value !== props.value) {
      await props.client.userCustomAttributesSet(props.userId, props.key, props.value)
    }
    return this.create({ userId: props.userId, key: props.key, value: props.value })
  } else if (this.phase === 'delete') {
    return this.destroy()
  }
  throw new Error('Unexpected phase')
})
