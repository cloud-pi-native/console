import type { Resource as AlchemyResource, Context } from 'alchemy'
import type { GitlabClient } from './client.js'
import { Resource } from 'alchemy'

export interface GitlabProjectCustomAttributeProps {
  client: GitlabClient
  projectId: number
  key: string
  value: string
}

export interface GitlabProjectCustomAttributeState {
  projectId: number
  key: string
  value: string
}

export type GitlabProjectCustomAttributeOutput = AlchemyResource<'gitlab:ProjectCustomAttribute'> & GitlabProjectCustomAttributeState

export const GitlabProjectCustomAttribute = Resource('gitlab:ProjectCustomAttribute', async function (
  this: Context<GitlabProjectCustomAttributeOutput, GitlabProjectCustomAttributeProps>,
  _id: string,
  props: GitlabProjectCustomAttributeProps,
) {
  if (this.phase === 'create') {
    await props.client.projectCustomAttributesSet(props.projectId, props.key, props.value)
    return this.create({ projectId: props.projectId, key: props.key, value: props.value })
  } else if (this.phase === 'update') {
    if (this.output.value !== props.value) {
      await props.client.projectCustomAttributesSet(props.projectId, props.key, props.value)
    }
    return this.create({ projectId: props.projectId, key: props.key, value: props.value })
  } else if (this.phase === 'delete') {
    return this.destroy()
  }
  throw new Error('Unexpected phase')
})
