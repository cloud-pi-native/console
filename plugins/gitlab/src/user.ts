import type { UserObject } from '@cpn-console/hooks'
import type { SimpleUserSchema } from '@cpn-console/miracle'
import { upsertCustomAttribute, userIdCustomAttributeKey } from './custom-attributes.js'
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

export async function upsertUser(user: UserObject, isAdmin?: boolean, isAuditor?: boolean): Promise<SimpleUserSchema> {
  const api = getClient()
  const username = createUsername(user.email)
  const existingUser = await getUser({ ...user, username })

  const userDefinitionBase = {
    name: `${user.firstName} ${user.lastName}`,
    username,
    email: user.email,
    externUid: user.email,
    provider: 'openid_connect',
    admin: isAdmin,
    auditor: isAuditor,
  }

  if (existingUser) {
    const incorrectProps: { key: string, curr: unknown, new: unknown }[] = []
    if (existingUser.name !== userDefinitionBase.name) incorrectProps.push({ key: 'name', curr: existingUser.name, new: userDefinitionBase.name })
    if (existingUser.username !== userDefinitionBase.username) incorrectProps.push({ key: 'username', curr: existingUser.username, new: userDefinitionBase.username })
    if (existingUser.email !== userDefinitionBase.email) incorrectProps.push({ key: 'email', curr: existingUser.email, new: userDefinitionBase.email })
    if ((existingUser.externUid ?? existingUser.extern_uid) !== userDefinitionBase.externUid) incorrectProps.push({ key: 'externUid', curr: existingUser.externUid ?? existingUser.extern_uid, new: userDefinitionBase.externUid })
    if (existingUser.provider !== userDefinitionBase.provider) incorrectProps.push({ key: 'provider', curr: existingUser.provider, new: userDefinitionBase.provider })
    if (existingUser.admin !== userDefinitionBase.admin) incorrectProps.push({ key: 'admin', curr: existingUser.admin, new: userDefinitionBase.admin })
    if (existingUser.auditor !== userDefinitionBase.auditor) incorrectProps.push({ key: 'auditor', curr: existingUser.auditor, new: userDefinitionBase.auditor })

    if (incorrectProps.length) {
      logger.debug({ action: 'upsertUser', changes: incorrectProps }, 'User properties differ from expected')
      try {
        await api.usersEdit(existingUser.id, userDefinitionBase)
      } catch (err) {
        logger.error({ action: 'upsertUser', err }, 'Failed to update user')
      }
    }
    try {
      await upsertCustomAttribute('users', existingUser.id, userIdCustomAttributeKey, user.id)
    } catch (err) {
      logger.debug({ action: 'upsertUser', userId: existingUser.id, err }, 'Failed to upsert user custom attribute')
    }
    return existingUser
  }

  const created = await api.usersCreate({
    ...userDefinitionBase,
    canCreateGroup: false,
    forceRandomPassword: true,
    projectsLimit: 0,
    skipConfirmation: true,
  })
  try {
    await upsertCustomAttribute('users', created.id, userIdCustomAttributeKey, user.id)
  } catch (err) {
    logger.debug({ action: 'upsertUser', userId: created.id, err }, 'Failed to upsert user custom attribute')
  }
  return created
}
