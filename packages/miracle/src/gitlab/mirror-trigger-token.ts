import type { Resource as AlchemyResource, Context } from 'alchemy'
import type { VaultKvClient } from '../vault/index.js'
import type { GitlabClient } from './client.js'
import type { PipelineTriggerTokenSchema } from './types.js'
import { Resource } from 'alchemy'

export interface GitlabMirrorTriggerTokenProps {
  client: GitlabClient
  vault: VaultKvClient
  repoId: number
  description: string
  vaultPath?: string
}

export interface GitlabMirrorTriggerTokenState {
  token: string
  repoId: number
}

export type GitlabMirrorTriggerTokenOutput = AlchemyResource<'gitlab:MirrorTriggerToken'> & GitlabMirrorTriggerTokenState

export const GitlabMirrorTriggerToken = Resource('gitlab:MirrorTriggerToken', async function (
  this: Context<GitlabMirrorTriggerTokenOutput, GitlabMirrorTriggerTokenProps>,
  _id: string,
  props: GitlabMirrorTriggerTokenProps,
) {
  if (this.phase === 'delete') return this.destroy()
  if (this.phase !== 'create' && this.phase !== 'update') throw new Error('Unexpected phase')

  const vaultPath = props.vaultPath ?? 'GITLAB'
  const existing = await props.vault.read(vaultPath, { throwIfNoEntry: false })
  if (existing?.data?.GIT_MIRROR_TOKEN && existing?.data?.GIT_MIRROR_PROJECT_ID === props.repoId) {
    return this.create({ token: existing.data.GIT_MIRROR_TOKEN, repoId: props.repoId })
  }

  const triggerToken: PipelineTriggerTokenSchema = await props.client.pipelineTriggerTokensCreate(props.repoId, props.description)
  return this.create({ token: triggerToken.token, repoId: props.repoId })
})
