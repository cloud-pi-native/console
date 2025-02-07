import type KeycloakAdminClient from '@keycloak/keycloak-admin-client'
import type GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation.js'

export const consoleGroupName = 'console'

export type CustomGroup = Required<Pick<GroupRepresentation, 'id' | 'name' | 'subGroups' | 'subGroupCount'>>
export async function getGroupByName(kcClient: KeycloakAdminClient, name: string): Promise<GroupRepresentation | void> {
  const groupSearch = await kcClient.groups.find({ search: name })
  return groupSearch.find(grp => grp.name === name)
}

export async function getAllGroups(kcClient: KeycloakAdminClient, first: number, initialGroups: GroupRepresentation[] = [], parentId?: string): Promise<GroupRepresentation[]> {
  const groups = parentId
    ? await kcClient.groups.listSubGroups({ parentId, briefRepresentation: false, max: 10, first })
    : await kcClient.groups.find({ briefRepresentation: false, max: 10, first })
  const newSubgroups = initialGroups.concat(groups)
  if (newSubgroups.length - initialGroups.length === 10) {
    return getAllGroups(kcClient, first + 10, newSubgroups, parentId)
  }
  return newSubgroups
}

export async function getOrCreateChildGroup(kcClient: KeycloakAdminClient, parentId: string, name: string, subGroups: GroupRepresentation[] | undefined = []): Promise<CustomGroup> {
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
  subGroups = await getAllGroups(kcClient, 0, [], parentId)
  // console.log(subGroups.map(({ name, path }) => ({ name, path })))

  const matchingGroup = subGroups?.find(({ name: groupName }) => groupName === name) as Required<GroupRepresentation> | undefined
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

export async function getOrCreateProjectGroup(kcClient: KeycloakAdminClient, name: string): Promise<Required<Pick<GroupRepresentation, 'id' | 'name' | 'subGroups' | 'subGroupCount'>> & { subGroups: Required<GroupRepresentation>[] }> {
  const existingGroup = await getGroupByName(kcClient, name) as Required<GroupRepresentation>
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
    // @ts-ignore mauvais typage de librairie les subGroups ont forcément un id
    subGroups: existingGroup.subGroups || [],
    subGroupCount: existingGroup.subGroups?.length || 0,
    name: existingGroup.name,
  }
}
