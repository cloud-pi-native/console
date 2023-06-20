import { api, getGroupRootId } from './utils.js'

export const getGroupId = async (name, organization) => {
  const parentId = await getOrganizationId(organization)
  const searchResult = await api.Groups.allSubgroups(parentId)
  // @ts-ignore TODO: Semble être un tableau
  const existingGroup = searchResult.find(group => group.name === name)
  return existingGroup?.id
}

const getOrganizationId = async (organization) => {
  const rootId = await getGroupRootId()
  const orgSearch = await api.Groups.allSubgroups(rootId)
  // @ts-ignore TODO: Semble être un tableau
  const org = orgSearch.find(org => org.name === organization)
  if (!org) {
    console.log(`Organization's group ${organization} does not exist on Gitlab, creating one...`) // TODO à attacher au logger de app
    const newOrg = await api.Groups.create(organization, organization, {
      parentId: rootId,
      projectCreationLevel: 'developer',
      subgroupCreationLevel: 'owner',
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
    parentId,
    projectCreationLevel: 'maintainer',
    subgroupCreationLevel: 'owner',
    defaultBranchProtection: 0,
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
