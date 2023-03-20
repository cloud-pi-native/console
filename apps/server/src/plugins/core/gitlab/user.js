import { api } from './utils.js'

const createUsername = (email) => email.replace('@', '.')

export const getUser = async (email) => {
  const users = await api.Users.search(email)
  return users.length ? users[0] : null
}

export const createUser = async (email) => {
  const searchResult = await api.Users.search(email)
  const existingUser = searchResult.find(user => user.email === email)
  if (existingUser) {
    return existingUser
  }

  return api.Users.create({
    admin: false,
    can_create_group: false,
    email,
    force_random_password: true,
    name: createUsername(email),
    skip_confirmation: true,
    username: createUsername(email),
  })
}

export const deleteUser = async (email) => {
  const searchResult = await api.Users.search(email)
  const user = searchResult.find(user => user.email === email)
  if (!user) {
    return
  }

  return api.Users.remove(user.id)
}
