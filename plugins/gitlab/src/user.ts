import type { UserObject } from '@cpn-console/hooks'
import type { CreateUserOptions, SimpleUserSchema } from '@gitbeaker/rest'
import { getApi, find, iter } from './utils.js'

export const createUsername = (email: string) => email.replace('@', '.')

export async function getUser(user: { email: string, username: string, id: string }): Promise<SimpleUserSchema | undefined> {
  const api = getApi()

  return find(
    iter(opts => api.Users.all(opts)),
    gitlabUser =>
      gitlabUser?.externUid === user.id
      || gitlabUser.email === user.email
      || gitlabUser.username === user.username,
  )
}

export async function upsertUser(user: UserObject): Promise<SimpleUserSchema> {
  const api = getApi()
  const username = createUsername(user.email)
  const existingUser = await getUser({ ...user, username })

  const userDefinitionBase: CreateUserOptions = {
    // required options
    name: `${user.firstName} ${user.lastName}`,
    username,
    email: user.email,
    // sso options
    externUid: user.id,
    provider: 'openid_connect',
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
      if (process.env.LOG_LEVEL === 'debug') {
        console.log(`Gitlab plugin: Updating user: ${user.email}`)
        console.log(incorrectProps)
      }
      await api.Users.edit(existingUser.id, userDefinitionBase)
    }
    return existingUser
  }

  return api.Users.create({
    ...userDefinitionBase,
    admin: false,
    canCreateGroup: false,
    forceRandomPassword: true,
    projectsLimit: 0,
    skipConfirmation: true,
  })
}
