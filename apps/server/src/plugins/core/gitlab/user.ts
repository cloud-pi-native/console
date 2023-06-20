import type { CreateUserOptions, ExpandedUserSchema, UserSchema } from '@gitbeaker/rest'
import { api } from './utils.js'

export const createUsername = (email: string) => email.replace('@', '.')

export const getUser = async (user: { email: string, username: string, id: string }) => {
  let gitlabUser: UserSchema

  // test finding by extern_uid by searching with email
  // TODO fix with https://github.com/jdalrymple/gitbeaker/issues/3315
  const usersByEmail = (await api.requester.get('users', { searchParams: { email: user.email } })).body as ExpandedUserSchema[]
  gitlabUser = usersByEmail.find(gitlabUser => gitlabUser?.externUid === user.id)
  if (gitlabUser) return gitlabUser

  // if not found, test finding by extern_uid by searching with username
  // TODO fix with https://github.com/jdalrymple/gitbeaker/issues/3315
  const usersByUsername = (await api.requester.get('users', { searchParams: { username: user.username } })).body as ExpandedUserSchema[]
  gitlabUser = usersByUsername.find(gitlabUser => gitlabUser?.externUid === user.id)
  if (gitlabUser) return gitlabUser

  // if not found, test finding by email or username
  const allUsers = [...usersByEmail, ...usersByUsername]
  return allUsers.find(gitlabUser => gitlabUser.email === user.email) ||
    allUsers.find(gitlabUser => gitlabUser.username === user.username)
}

export const createUser = async (user) => {
  user.username = createUsername(user.email)
  const existingUser = await getUser(user)

  const userDefinitionBase: CreateUserOptions = {
    // required options
    name: `${user.firstName} ${user.lastName}`,
    username: user.username,
    email: user.email,
    // sso options
    externUid: user.id,
    provider: 'openid_connect',
  }

  if (existingUser) {
    if (Object.keys(userDefinitionBase).some(prop => existingUser[prop] !== userDefinitionBase[prop])) {
      api.Users.edit(existingUser.id, userDefinitionBase)
    }
    api.Users.edit(existingUser.id, {})
    return existingUser
  }

  const userDefinition = {
    ...userDefinitionBase,
    // optionals options
  }
  return api.Users.create({
    ...userDefinitionBase,
    admin: false,
    canCreateGroup: false,
    forceRandomPassword: 'true',
    projectsLimit: true,
    skipConfirmation: true,
  })
}
