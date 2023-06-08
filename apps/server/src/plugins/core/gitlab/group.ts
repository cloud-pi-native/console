import { api, getGroupRootId } from './utils.js'

export const getGroupId = async (name, organization) => {
  const parentId = await getOrganizationId(organization)
  const searchResult = await api.Groups.subgroups(parentId)
  // @ts-ignore TODO: Semble être un tableau
  const existingGroup = searchResult.find(group => group.name === name)
  return existingGroup?.id
}

const getOrganizationId = async (organization) => {
  const rootId = await getGroupRootId()
  const orgSearch = await api.Groups.subgroups(rootId)
  // @ts-ignore TODO: Semble être un tableau
  const org = orgSearch.find(org => org.name === organization)
  if (!org) {
    console.log(`Organization's group ${organization} does not exist on Gitlab, creating one...`) // TODO à attacher au logger de app
    const newOrg = await api.Groups.create(organization, organization, {
      parent_id: rootId,
      project_creation_level: 'developer',
      subgroup_creation_level: 'owner',
      validate_certs: false,
    })
    return newOrg.id
  }
  return org.id
}

export const createGroup = async (name, organization) => {
  const searchResult = await api.Groups.search(name)
  const parentId = await getOrganizationId(organization)
  // @ts-ignore TODO: Semble être un tableau
  const existingGroup = searchResult.find(group => group.parent_id === parentId)
  if (existingGroup) {
    return existingGroup
  }

  return api.Groups.create(name, name, {
    parent_id: parentId,
    project_creation_level: 'maintainer',
    subgroup_creation_level: 'owner',
    default_branch_protection: 0,
  })
}

export const deleteGroup = async (name, organization) => {
  const searchResult = await api.Groups.search(name)
  const parentId = await getOrganizationId(organization)
  // @ts-ignore TODO: Semble être un tableau
  const existingGroup = searchResult.find(group => group.parent_id === parentId)
  if (!existingGroup) {
    return
  }
  return api.Groups.remove(existingGroup.id)
}
