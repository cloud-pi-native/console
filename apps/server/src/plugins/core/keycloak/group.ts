import KeycloakAdminClient from '@keycloak/keycloak-admin-client'
import GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation'

export const getGroups = async (kcClient: KeycloakAdminClient) => {
  return kcClient.groups.find()
}

export const getProjectGroupByName = async (kcClient: KeycloakAdminClient, name: string): Promise<GroupRepresentation | void> => {
  const groupSearch = await kcClient.groups.find({ search: name })
  return groupSearch.find(grp => grp.name === name)
}
