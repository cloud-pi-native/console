import KcAdminClient from '@keycloak/keycloak-admin-client'

import {
  keycloakProtocol,
  keycloakDomain,
  keycloakRealm,
  keycloakUser,
  keycloakToken,
} from './env.js'

const kcAdminClient = new KcAdminClient({
  baseUrl: `${keycloakProtocol}://${keycloakDomain}`,
  realmName: keycloakRealm,
})

await kcAdminClient.auth({
  username: keycloakUser,
  password: keycloakToken,
  grantType: 'password',
  clientId: 'admin-cli',
})

export const getGroups = async () => {
  return kcAdminClient.groups.find()
}

export const createGroups = async (groupsName) => {
  const groupRes = await kcAdminClient.groups.find()
  await Promise.all(
    groupsName.map((groupName) => {
      const group = groupRes.find((groupRes) => groupRes.name === groupName)
      return (
        group ||
        kcAdminClient.groups.create({
          name: groupName,
        })
      )
    }),
  )
}

export const deleteGroups = async (groupsName) => {
  const groupRes = await kcAdminClient.groups.find()
  await Promise.all(
    groupsName.map((groupName) => {
      const group = groupRes.find((groupRes) => groupRes.name === groupName)
      return (
        !group ||
        kcAdminClient.groups.del({
          id: group.id,
        })
      )
    }),
  )
}

export const getMembers = async (groupName) => {
  const allGroups = await getGroups()
  const { id } = allGroups.find((group) => groupName === group.name)
  return kcAdminClient.groups.listMembers({ id })
}

export const getUsers = async () => {
  return kcAdminClient.users.find()
}

export const getUserByEmail = async (email) => {
  return kcAdminClient.users.find({ email })
}

export const removeMembers = async (usersId, groupsName) => {
  const allGroups = await getGroups()
  const groups = allGroups.filter((group) => groupsName.includes(group.name))
  const prms = groups.flatMap((group) => (usersId.map((id) => kcAdminClient.users.delFromGroup({ id, groupId: group.id }))))
  return Promise.all(prms)
}

export const addMembers = async (usersId, groupsName) => {
  const allGroups = await getGroups()
  const groups = allGroups.filter((group) => groupsName.includes(group.name))
  const prms = groups.flatMap((group) => (usersId.map((id) => kcAdminClient.users.addToGroup({ id, groupId: group.id }))))
  return Promise.all(prms)
}
