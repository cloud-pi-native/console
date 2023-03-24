import app from '../../../app.js'
import { api, getGroupRootId } from './index.js'

export const getOrganizationId = async (organization) => {
  const rootId = await getGroupRootId()
  const orgSearch = await api.Groups.search(organization, { parent_id: rootId })
  const org = orgSearch.find(org => org.parent_id === rootId)
  if (org === undefined) {
    app.log.info(`Organization's group ${organization} does not exist on Gitlab, creating one...`)
    const newOrg = await api.Groups.create(organization, organization, { parent_id: rootId })
    return newOrg.id
  }
  return org.id
}

export const createGroup = async (payload) => {
  try {
    const { organization, name } = payload.args
    const searchResult = await api.Groups.search(name)
    const parentId = await getOrganizationId(organization)
    const oldGroup = searchResult.find(grp => grp.parent_id === parentId)
    console.log({ oldGroup })
    if (oldGroup) {
      return {
        status: {
          result: 'OK',
          message: 'Already Exists',
        },
        group: oldGroup,
        vault: [{
          name: 'GITLAB',
          data: {
            ORGANIZATION_NAME: organization,
            PROJECT_NAME: name,
          },
        }],
      }
    }
    const newOrg = await api.Groups.create(name, name, { parent_id: parentId })
    return {
      status: {
        result: 'OK',
        message: 'Created',
      },
      group: newOrg,
      vault: [{
        name: 'GITLAB',
        data: {
          ORGANIZATION_NAME: organization,
          PROJECT_NAME: name,
        },
      }],
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: error.message,
      },
    }
  }
}

export const deleteGroup = async (payload) => {
  try {
    const { organization, name } = payload.args
    const searchResult = await api.Groups.search(name)
    const parentId = await getOrganizationId(organization)
    const oldGroup = searchResult.find(grp => grp.parent_id === parentId)
    if (!oldGroup) {
      return {
        status: {
          result: 'OK',
          message: 'Missing',
        },
      }
    }
    await api.Groups.remove(oldGroup.id)
    return {
      status: {
        result: 'OK',
        message: 'Deleted',
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: error.message,
      },
    }
  }
}
