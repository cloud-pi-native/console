import KeycloakAdminClient from '@keycloak/keycloak-admin-client'

export const removeMembers = async (kcClient: KeycloakAdminClient, usersId: string[], groupId: string) => {
  return Promise.all(usersId.map(userId => (kcClient.users.delFromGroup({ id: userId, groupId }))))
}

export const addMembers = async (kcClient: KeycloakAdminClient, usersId: string[], groupId: string) => {
  return Promise.all(usersId.map(userId => (kcClient.users.addToGroup({ id: userId, groupId }))))
}
