import type { Context } from 'alchemy'
import type { VaultKvClient } from '../vault/index.js'
import type { GitlabClient } from './client.js'
import type { GroupAccessTokenCreateResponse } from './types.js'
import { Resource } from 'alchemy'

export interface GitlabMirrorCredsProps {
  client: GitlabClient
  vault: VaultKvClient
  groupId: number
  tokenName: string
  vaultPath?: string
}

export interface GitlabMirrorCredsState {
  MIRROR_USER: string
  MIRROR_TOKEN: string
}

export type GitlabMirrorCredsOutput = Resource<'gitlab:MirrorCreds'> & GitlabMirrorCredsState

export const GitlabMirrorCreds = Resource('gitlab:MirrorCreds', async function (
  this: Context<GitlabMirrorCredsOutput, GitlabMirrorCredsProps>,
  _id: string,
  props: GitlabMirrorCredsProps,
) {
  if (this.phase === 'delete') return this.destroy()
  if (this.phase !== 'create' && this.phase !== 'update') throw new Error('Unexpected phase')

  const vaultPath = props.vaultPath ?? 'tech/GITLAB_MIRROR'
  const existing = await props.vault.read(vaultPath, { throwIfNoEntry: false })
  if (existing?.data?.MIRROR_TOKEN && existing?.data?.MIRROR_USER) {
    try {
      await props.client.validateTokenForGroup(props.groupId, existing.data.MIRROR_TOKEN)
      return this.create({ MIRROR_USER: existing.data.MIRROR_USER, MIRROR_TOKEN: existing.data.MIRROR_TOKEN })
    } catch {}
  }

  const expiryDate = new Date()
  expiryDate.setFullYear(expiryDate.getFullYear() + 1)
  const expiresAt = expiryDate.toISOString().slice(0, 10)

  const newToken: GroupAccessTokenCreateResponse = await props.client.groupAccessTokensCreate(
    props.groupId,
    props.tokenName,
    ['write_repository', 'read_repository', 'read_api'],
    expiresAt,
  )
  const nextCreds = { MIRROR_USER: newToken.name, MIRROR_TOKEN: newToken.token }
  await props.vault.write(vaultPath, nextCreds)
  return this.create(nextCreds)
})
