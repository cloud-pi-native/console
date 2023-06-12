import { api } from './utils.js'

const createUsername = (email) => email.replace('@', '.')

export const getUser = async (user) => {
  let gitlabUser

  // test finding by extern_uid by searching with email
  const usersByEmail = await api.Users.search(user.email)
  gitlabUser = usersByEmail.find(gitlabUser => gitlabUser?.extern_uid === user.id)
  if (gitlabUser) return gitlabUser

  // if not found, test finding by extern_uid by searching with username
  const usersByUsername = await api.Users.search(user.username)
  gitlabUser = usersByUsername.find(gitlabUser => gitlabUser?.extern_uid === user.id)
  if (gitlabUser) return gitlabUser

  // if not found, test finding by email or username
  const allUsers = [...usersByEmail, ...usersByUsername]
  return allUsers.find(gitlabUser => gitlabUser.email === user.email) ||
    allUsers.find(gitlabUser => gitlabUser.username === user.username)
}

export const createUser = async (user) => {
  user.username = createUsername(user.email)
  const existingUser = await getUser(user)

  const userDefinitionBase = {
    // required options
    name: `${user.firstName} ${user.lastName}`,
    username: user.username,
    email: user.email,
    // sso options
    extern_uid: user.id,
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
    admin: false,
    can_create_group: false,
    force_random_password: true,
    projects_limit: 0,
    skip_confirmation: true,
  }
  return api.Users.create(userDefinition)
}

export const deleteUser = async (email) => {
  const searchResult = await api.Users.search(email)
  const user = searchResult.find(user => user.email === email)
  if (!user) {
    return
  }

  return api.Users.remove(user.id)
}
