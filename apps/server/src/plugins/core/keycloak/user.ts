export const getUsers = async (kcClient) => {
  return kcClient.users.find()
}

export const getUserByEmail = async (kcClient, email) => {
  return (await kcClient.users.find({ email }))[0]
}
