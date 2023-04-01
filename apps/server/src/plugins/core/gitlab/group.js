import app from '../../../app.js'
import { api, getGroupRootId } from './index.js'

const getOrganizationId = async (organization) => {
  const rootId = await getGroupRootId()
  const orgSearch = await api.Groups.search(organization, { parent_id: rootId })
  const org = orgSearch.find(org => org.parent_id === rootId)
  if (!org) {
    app.log.info(`Organization's group ${organization} does not exist on Gitlab, creating one...`)
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
  const existingGroup = searchResult.find(group => group.parent_id === parentId)
  if (existingGroup) {
    return existingGroup
  }

  return api.Groups.create(name, name, {
    parent_id: parentId,
    project_creation_level: 'maintainer',
    subgroup_creation_level: 'owner',
  })
}

export const deleteGroup = async (name, organization) => {
  const searchResult = await api.Groups.search(name)
  const parentId = await getOrganizationId(organization)
  const existingGroup = searchResult.find(group => group.parent_id === parentId)
  if (!existingGroup) {
    return
  }
  return api.Groups.remove(existingGroup.id)
}
