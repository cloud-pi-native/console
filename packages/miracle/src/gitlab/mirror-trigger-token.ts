import type { Context } from 'alchemy'
import type { GitlabClient } from './client.js'
import type { PipelineTriggerTokenSchema } from './types.js'
import { Resource } from 'alchemy'

export interface GitlabMirrorTriggerTokenProps {
  client: GitlabClient
  repoId: number
  description: string
  rotate?: boolean
}

export interface GitlabMirrorTriggerTokenState {
  token: string
  repoId: number
}

export type GitlabMirrorTriggerTokenOutput = Resource<'gitlab:MirrorTriggerToken'> & GitlabMirrorTriggerTokenState

export const GitlabMirrorTriggerToken = Resource('gitlab:MirrorTriggerToken', async function (
  this: Context<GitlabMirrorTriggerTokenOutput, GitlabMirrorTriggerTokenProps>,
  _id: string,
  props: GitlabMirrorTriggerTokenProps,
) {
  if (this.phase === 'delete') return this.destroy()
  if (this.phase !== 'create' && this.phase !== 'update') throw new Error('Unexpected phase')

  const shouldReuseExisting = this.phase === 'update' && props.rotate !== true && this.output.repoId === props.repoId
  if (shouldReuseExisting) {
    return this.create({ token: this.output.token, repoId: props.repoId })
  }

  const triggerToken: PipelineTriggerTokenSchema = await props.client.pipelineTriggerTokensCreate(props.repoId, props.description)
  return this.create({ token: triggerToken.token, repoId: props.repoId })
})
