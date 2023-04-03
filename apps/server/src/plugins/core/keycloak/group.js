import { kcClient } from './index.js'

export const getGroups = async () => {
  return kcClient.groups.find()
}

export const createGroups = async (groupsName) => {
  const groupRes = await kcClient.groups.find()
  return Promise.all(
    groupsName.map((groupName) => {
      const group = groupRes.find((groupRes) => groupRes.name === groupName)
      return (
        group ||
        kcClient.groups.create({
          name: groupName,
        })
      )
    }),
  )
}

export const deleteGroups = async (groupsName) => {
  const groupRes = await kcClient.groups.find()
  await Promise.all(
    groupsName.map((groupName) => {
      const group = groupRes.find((groupRes) => groupRes.name === groupName)
      return (
        !group ||
        kcClient.groups.del({
          id: group.id,
        })
      )
    }),
  )
}
