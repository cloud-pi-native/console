import type KeycloakAdminClient from '@keycloak/keycloak-admin-client'
import type GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation.js'

export const consoleGroupName = 'console'

export type CustomGroup = Required<Pick<GroupRepresentation, 'id' | 'name' | 'subGroups' | 'subGroupCount'>>
export async function getGroupByName(kcClient: KeycloakAdminClient, name: string): Promise<GroupRepresentation | void> {
  const groupSearch = await kcClient.groups.find({ search: name })
  return groupSearch.find(grp => grp.name === name)
}

export async function getAllSubgroups(kcClient: KeycloakAdminClient, parentId: string, first: number, subgroups: GroupRepresentation[] = []): Promise<GroupRepresentation[]> {
  const newSubgroups = [
    ...subgroups,
    ...await kcClient.groups.listSubGroups({ parentId, briefRepresentation: false, max: 10, first }),
  ]
  if (newSubgroups.length - subgroups.length === 10) {
    return getAllSubgroups(kcClient, parentId, first + 10, newSubgroups)
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
  subGroups = await getAllSubgroups(kcClient, parentId, 0)
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

export async function getOrCreateGroupByName(kcClient: KeycloakAdminClient, name: string): Promise<Required<GroupRepresentation>> {
  const group = await getGroupByName(kcClient, name)
  if (group) return group as Required<GroupRepresentation>
  const newGroup = await kcClient.groups.create({ name })
  const created = await kcClient.groups.findOne({ id: newGroup.id })
  if (!created) throw new Error(`Failed to retrieve created group: ${name}`)
  return created as Required<GroupRepresentation>
}

export async function getOrCreateGroupByPath(kcClient: KeycloakAdminClient, path: string): Promise<Required<GroupRepresentation>> {
  if (!path.startsWith('/')) {
    return getOrCreateGroupByName(kcClient, path)
  }

  const name = path.split('/').pop() || ''
  const groups = await kcClient.groups.find({ search: name })
  const existingGroup = groups.find(g => g.path === path)

  if (existingGroup) return existingGroup as Required<GroupRepresentation>

  const groupNames = path.split('/').filter(Boolean)
  let parentId: string | undefined

  for (const groupName of groupNames) {
    const subGroups = parentId
      ? await kcClient.groups.listSubGroups({ parentId })
      : await kcClient.groups.find({ search: groupName })
    const existingSubGroup = subGroups.find(g => g.name === groupName)

    if (existingSubGroup) {
      parentId = existingSubGroup.id
    } else {
      const newGroup = parentId
        ? await kcClient.groups.createChildGroup({ id: parentId }, { name: groupName })
        : await kcClient.groups.create({ name: groupName })
      parentId = newGroup.id
    }
  }

  if (parentId) {
    const group = await kcClient.groups.findOne({ id: parentId })
    if (group) return group as Required<GroupRepresentation>
  }
  throw new Error(`Failed to create group path: ${path}`)
}
