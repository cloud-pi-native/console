import type { SimpleUserSchema } from '@cpn-console/miracle'
import { logger } from './logger.js'
import { find, getClient, offsetPaginate } from './utils.js'

export function createUsername(email: string) {
  const parts = email.split('@')
  if (parts.length > 0) {
    return parts[0]
  }
  return email
}

export async function getUser(user: { email: string, username: string, id: string }): Promise<SimpleUserSchema | undefined> {
  const api = getClient()

  const isUser = (gitlabUser: SimpleUserSchema) =>
    gitlabUser?.externUid === user.id
    || gitlabUser?.externUid === user.email
    || gitlabUser?.extern_uid === user.id
    || gitlabUser?.extern_uid === user.email
    || gitlabUser.email === user.email
    || gitlabUser.username === user.username

  const fast = await find(
    offsetPaginate((opts: { page: number, perPage?: number }) => api.usersAll({
      extern_uid: user.email,
      provider: 'openid_connect',
      order_by: 'username',
      as_admin: true,
    }, opts.page, opts.perPage)),
    isUser,
  )

  if (!fast) {
    logger.debug({ action: 'getUser', user }, 'User not found in fast search')
  }

  return fast ?? await find(
    offsetPaginate((opts: { page: number, perPage?: number }) => api.usersAll({
      search: user.username,
      as_admin: true,
    }, opts.page, opts.perPage)),
    isUser,
  )
}
