import type { Context } from 'alchemy'
import type { GitlabClient } from './client.js'
import type { GroupAccessTokenCreateResponse } from './types.js'
import { Resource } from 'alchemy'

export interface GitlabMirrorCredsProps {
  client: GitlabClient
  groupId: number
  tokenName: string
  rotate?: boolean
}

export interface GitlabMirrorCredsState {
  MIRROR_USER: string
  MIRROR_TOKEN: string
  groupId: number
}

export type GitlabMirrorCredsOutput = Resource<'gitlab:MirrorCreds'> & GitlabMirrorCredsState

export const GitlabMirrorCreds = Resource('gitlab:MirrorCreds', async function (
  this: Context<GitlabMirrorCredsOutput, GitlabMirrorCredsProps>,
  _id: string,
  props: GitlabMirrorCredsProps,
) {
  if (this.phase === 'delete') return this.destroy()
  if (this.phase !== 'create' && this.phase !== 'update') throw new Error('Unexpected phase')

  const shouldReuseExisting = this.phase === 'update' && props.rotate !== true && this.output.groupId === props.groupId
  if (shouldReuseExisting) {
    try {
      await props.client.validateTokenForGroup(props.groupId, this.output.MIRROR_TOKEN)
      return this.create({ MIRROR_USER: this.output.MIRROR_USER, MIRROR_TOKEN: this.output.MIRROR_TOKEN, groupId: props.groupId })
    } catch {
      void 0
    }
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
  const nextCreds = { MIRROR_USER: newToken.name, MIRROR_TOKEN: newToken.token, groupId: props.groupId }
  return this.create(nextCreds)
})
