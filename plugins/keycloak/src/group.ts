import KeycloakAdminClient from '@keycloak/keycloak-admin-client'
// @ts-ignore
import GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation'

export const getGroups = async (kcClient: KeycloakAdminClient) => {
  return kcClient.groups.find()
}

export const getProjectGroupByName = async (kcClient: KeycloakAdminClient, name: string): Promise<GroupRepresentation | void> => {
  const groupSearch = await kcClient.groups.find({ search: name })
  return groupSearch.find(grp => grp.name === name)
}

export const getOrCreateChildGroup = async (kcClient: KeycloakAdminClient, parentId: string, name: string, subGroups: GroupRepresentation[] | undefined = []): Promise<Required<Pick<GroupRepresentation, 'id' | 'name' | 'subGroups' | 'subGroupCount'>>> => {
  if (Array.isArray(subGroups) && subGroups.length > 0) {
    const matchingGroup = subGroups.find(({ name: groupName }) => groupName === name) as Required<GroupRepresentation> | undefined
    if (matchingGroup) {
      return {
        id: matchingGroup.id,
        subGroups: matchingGroup.subGroups || [],
        subGroupCount: matchingGroup.subGroups?.length || 0,
        name,
      }
    }
  }

  const existingGroup = await kcClient.groups.findOne({ id: parentId })
  const matchingGroup = existingGroup?.subGroups?.find(({ name: groupName }) => groupName === name) as Required<GroupRepresentation> | undefined
  if (!matchingGroup) {
    const newGroup = await kcClient.groups.createChildGroup({ id: parentId }, { name })
    return {
      id: newGroup.id,
      subGroups: [],
      subGroupCount: 0,
      name,
    }
  }
  return {
    id: matchingGroup.id,
    subGroups: matchingGroup.subGroups || [],
    subGroupCount: matchingGroup.subGroups?.length || 0,
    name,
  }
}

export const getOrCreateProjectGroup = async (kcClient: KeycloakAdminClient, name: string): Promise<Required<Pick<GroupRepresentation, 'id' | 'name' | 'subGroups' | 'subGroupCount'>>> => {
  const existingGroup = await getProjectGroupByName(kcClient, name) as Required<GroupRepresentation>
  if (!existingGroup) {
    const newGroup = await kcClient.groups.create({ name })
    return {
      id: newGroup.id,
      subGroups: [],
      subGroupCount: 0,
      name,
    }
  }
  return {
    id: existingGroup.id,
    subGroups: existingGroup.subGroups || [],
    subGroupCount: existingGroup.subGroups?.length || 0,
    name: existingGroup.name,
  }
}
