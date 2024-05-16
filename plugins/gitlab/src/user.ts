import type { CreateUserOptions, UserSchema } from '@gitbeaker/rest'
import { getApi } from './utils.js'
import { UserObject } from '@cpn-console/hooks'

export const createUsername = (email: string) => email.replace('@', '.')

export const getUser = async (user: { email: string, username: string, id: string }): Promise<UserSchema | undefined> => {
  const api = getApi()

  let gitlabUser: UserSchema | undefined

  // test finding by extern_uid by searching with email
  const usersByEmail = await api.Users.all({ search: user.email })
  gitlabUser = usersByEmail.find(gitlabUser => gitlabUser?.externUid === user.id)
  if (gitlabUser) return gitlabUser

  // if not found, test finding by extern_uid by searching with username
  const usersByUsername = await api.Users.all({ username: user.username })
  gitlabUser = usersByUsername.find(gitlabUser => gitlabUser?.externUid === user.id)
  if (gitlabUser) return gitlabUser

  // if not found, test finding by email or username
  const allUsers = [...usersByEmail, ...usersByUsername]
  return allUsers.find(gitlabUser => gitlabUser.email === user.email) ||
    allUsers.find(gitlabUser => gitlabUser.username === user.username)
}

export const upsertUser = async (user: UserObject): Promise<UserSchema> => {
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
