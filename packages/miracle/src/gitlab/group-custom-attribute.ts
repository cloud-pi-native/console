import type { Context } from 'alchemy'
import type { GitlabClient } from './client.js'
import { Resource } from 'alchemy'

export interface GitlabGroupCustomAttributeProps {
  client: GitlabClient
  groupId: number
  key: string
  value: string
}

export interface GitlabGroupCustomAttributeState {
  groupId: number
  key: string
  value: string
}

export type GitlabGroupCustomAttributeOutput = Resource<'gitlab:GroupCustomAttribute'> & GitlabGroupCustomAttributeState

export const GitlabGroupCustomAttribute = Resource('gitlab:GroupCustomAttribute', async function (
  this: Context<GitlabGroupCustomAttributeOutput, GitlabGroupCustomAttributeProps>,
  _id: string,
  props: GitlabGroupCustomAttributeProps,
) {
  if (this.phase === 'create') {
    await props.client.groupCustomAttributesSet(props.groupId, props.key, props.value)
    return this.create({ groupId: props.groupId, key: props.key, value: props.value })
  } else if (this.phase === 'update') {
    if (this.output.value !== props.value) {
      await props.client.groupCustomAttributesSet(props.groupId, props.key, props.value)
    }
    return this.create({ groupId: props.groupId, key: props.key, value: props.value })
  } else if (this.phase === 'delete') {
    return this.destroy()
  }
  throw new Error('Unexpected phase')
})
