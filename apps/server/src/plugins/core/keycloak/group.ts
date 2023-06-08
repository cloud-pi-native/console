export const getGroups = async (kcClient) => {
  return kcClient.groups.find()
}

export const getProjectGroupByName = async (kcClient, name) => {
  const groupSearch = await kcClient.groups.find({ name })
  return groupSearch.find(grp => grp.name === name)
}
