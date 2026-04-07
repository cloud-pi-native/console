import type KeycloakAdminClient from '@keycloak/keycloak-admin-client'
import type GroupRepresentation from '@keycloak/keycloak-admin-client/lib/defs/groupRepresentation.js'

export async function findGroupByName(kcClient: KeycloakAdminClient, name: string): Promise<GroupRepresentation | undefined> {
  const groupSearch = await kcClient.groups.find({ search: name })
  return groupSearch.find((grp: GroupRepresentation) => grp.name === name)
}

export async function findGroupByPath(kcClient: KeycloakAdminClient, path: string): Promise<GroupRepresentation | undefined> {
  if (!path.startsWith('/')) return undefined
  const name = path.split('/').pop() || ''
  const groups = await kcClient.groups.find({ search: name })
  return groups.find((g: GroupRepresentation) => g.path === path)
}

export async function listAllSubgroups(
  kcClient: KeycloakAdminClient,
  parentId: string,
  first: number,
  subgroups: GroupRepresentation[] = [],
): Promise<GroupRepresentation[]> {
  const nextSubgroups: GroupRepresentation[] = [
    ...subgroups,
    ...await kcClient.groups.listSubGroups({ parentId, briefRepresentation: false, max: 10, first }),
  ]
  if (nextSubgroups.length - subgroups.length === 10) {
    return listAllSubgroups(kcClient, parentId, first + 10, nextSubgroups)
  }
  return nextSubgroups
}

export async function ensureGroupByPath(kcClient: KeycloakAdminClient, path: string): Promise<GroupRepresentation> {
  if (!path.startsWith('/')) {
    const existing = await findGroupByName(kcClient, path)
    if (existing) return existing
    const created = await kcClient.groups.create({ name: path })
    const group = await kcClient.groups.findOne({ id: created.id })
    if (!group) throw new Error(`Failed to retrieve created group: ${path}`)
    return group
  }

  const existingGroup = await findGroupByPath(kcClient, path)
  if (existingGroup) return existingGroup

  const groupNames = path.split('/').filter(Boolean)
  let parentId: string | undefined

  for (const groupName of groupNames) {
    const subGroups: GroupRepresentation[] = parentId
      ? await kcClient.groups.listSubGroups({ parentId })
      : await kcClient.groups.find({ search: groupName })
    const existingSubGroup = subGroups.find((g: GroupRepresentation) => g.name === groupName)

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
    if (group) return group
  }

  throw new Error(`Failed to create group path: ${path}`)
}
