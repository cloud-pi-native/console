import type { Context } from 'alchemy'
import type { GitlabClient } from './client.js'
import type { GroupSchema, Visibility } from './types.js'
import { Resource } from 'alchemy'

export interface GitlabGroupProps {
  client: GitlabClient
  name: string
  path: string
  parentId?: number
  createArgs?: {
    visibility?: Visibility
    projectCreationLevel?: 'noone' | 'maintainer' | 'developer'
    subgroupCreationLevel?: string
    defaultBranchProtection?: 0 | 1 | 2 | 3
    description?: string
  }
}

export type GitlabGroupOutput = Resource<'gitlab:Group'> & GroupSchema

export const GitlabGroup = Resource('gitlab:Group', async function (
  this: Context<GitlabGroupOutput, GitlabGroupProps>,
  _id: string,
  props: GitlabGroupProps,
) {
  if (this.phase === 'create') {
    const existing = await props.client.groupsShow(props.path).catch(() => undefined)
    if (existing) return this.create(existing)

    const group = await props.client.groupsCreate(props.name, props.path, {
      parentId: props.parentId,
      visibility: props.createArgs?.visibility,
      projectCreationLevel: props.createArgs?.projectCreationLevel,
      subgroupCreationLevel: props.createArgs?.subgroupCreationLevel,
      defaultBranchProtection: props.createArgs?.defaultBranchProtection,
      description: props.createArgs?.description,
    })
    return this.create(group)
  } else if (this.phase === 'update') {
    const group = await props.client.groupsEdit(this.output.id, {
      name: props.name,
      path: props.path,
    })
    return this.create(group)
  } else if (this.phase === 'delete') {
    return this.destroy()
  }
  throw new Error('Unexpected phase')
})
