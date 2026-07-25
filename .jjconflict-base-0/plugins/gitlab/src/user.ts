import type { UserObject } from '@cpn-console/hooks'
import type { CreateUserOptions, SimpleUserSchema } from '@gitbeaker/rest'
import { upsertCustomAttribute, userIdCustomAttributeKey } from './custom-attributes.js'
import { logger } from './logger.js'
import { find, getApi, offsetPaginate } from './utils.js'

export function createUsername(email: string) {
  const parts = email.split('@')
  if (parts.length > 0) {
    return parts[0]
  }
  return email
}

export async function getUser(user: { email: string, username: string, id: string }): Promise<SimpleUserSchema | undefined> {
  const api = getApi()

  const isUser = (gitlabUser: SimpleUserSchema) =>
    gitlabUser?.externUid === user.id
    || gitlabUser?.externUid === user.email
    || gitlabUser.email === user.email
    || gitlabUser.username === user.username

  const fast = await find(
    offsetPaginate(opts => api.Users.all({
      externUid: user.email,
      provider: 'openid_connect',
      orderBy: 'username',
      asAdmin: true,
      ...opts,
    })),
    isUser,
  )

  if (!fast) {
    logger.debug({ action: 'getUser', user }, 'User not found in fast search')
  }

  return fast ?? await find(
    offsetPaginate(opts => api.Users.all({
      search: user.username,
      asAdmin: true,
      ...opts,
    })),
    isUser,
  )
}

export async function upsertUser(user: UserObject, isAdmin?: boolean, isAuditor?: boolean): Promise<SimpleUserSchema> {
  const api = getApi()
  const username = createUsername(user.email)
  const existingUser = await getUser({ ...user, username })

  const userDefinitionBase: CreateUserOptions = {
    // required options
    name: `${user.firstName} ${user.lastName}`,
    username,
    email: user.email,
    // sso options
    externUid: user.email,
    provider: 'openid_connect',
    admin: isAdmin,
    auditor: isAuditor,
  }

  if (existingUser) {
    const incorrectProps = Object.entries(userDefinitionBase).reduce((acc, [key, value]) => {
      if (existingUser[key] !== value) {
        acc.push({
          key,
          curr: existingUser[key],
          new: value,
        })
      }
      return acc
    }, [] as { key: string, curr: any, new: any }[])

    if (incorrectProps.length) {
      logger.debug({ action: 'upsertUser', changes: incorrectProps }, 'User properties differ from expected')
      try {
        await api.Users.edit(existingUser.id, userDefinitionBase)
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

  const created = await api.Users.create({
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
