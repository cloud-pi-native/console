import { getApi, getGroupRootId } from './utils.js'

export const getOrganizationId = async (organization: string) => {
  const api = getApi()
  const rootId = await getGroupRootId()
  const orgSearch = await api.Groups.allSubgroups(rootId)
  const org = orgSearch.find(org => org.name === organization)

  if (org) return org.id
  console.log(`Organization's group ${organization} does not exist on Gitlab, creating one...`) // TODO à attacher au logger de app
  return (await api.Groups.create(organization, organization, {
    parentId: rootId,
    projectCreationLevel: 'developer',
    subgroupCreationLevel: 'owner',
  })).id
}

export const deleteGroup = async (groupId: number) => {
  const api = getApi()
  return api.Groups.remove(groupId)
}
