import type { Resource as AlchemyResource, Context } from 'alchemy'
import type { GitlabClient } from './client.js'
import type { CommitAction } from './types.js'
import { Resource } from 'alchemy'

export interface GitlabCommitProps {
  client: GitlabClient
  projectId: number
  branch: string
  commitMessage: string
  actions: CommitAction[]
}

export interface GitlabCommitState {
  projectId: number
  branch: string
  commitMessage: string
  actionsCount: number
}

export type GitlabCommitOutput = AlchemyResource<'gitlab:Commit'> & GitlabCommitState

export const GitlabCommit = Resource('gitlab:Commit', async function (
  this: Context<GitlabCommitOutput, GitlabCommitProps>,
  _id: string,
  props: GitlabCommitProps,
) {
  if (this.phase === 'create' || this.phase === 'update') {
    await props.client.commitsCreate(props.projectId, props.branch, props.commitMessage, props.actions)
    return this.create({ projectId: props.projectId, branch: props.branch, commitMessage: props.commitMessage, actionsCount: props.actions.length })
  } else if (this.phase === 'delete') {
    return this.destroy()
  }
  throw new Error('Unexpected phase')
})
