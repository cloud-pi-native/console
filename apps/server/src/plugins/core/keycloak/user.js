import { kcAdminClient } from './index.js'

export const getUsers = async () => {
  return kcAdminClient.users.find()
}

export const getUserByEmail = async (email) => {
  return kcAdminClient.users.find({ email })
}
