export const getUsers = async (kcClient) => {
  return kcClient.users.find()
}

export const getUserByEmail = async (kcClient, email) => {
  return kcClient.users.find({ email })
}
