import { generate } from 'generate-password'
import app from '../../../app.js'
import { api, getGroupRootId } from './index.js'

export const addMemberToGroup = async (groupId, userId) => {
  return api.GroupMembers.add(groupId, userId, 10)
}
export const getOrganizationId = async (organization) => {
  const rootId = await getGroupRootId()
  const orgSearch = await api.Groups.search(organization, { parent_id: rootId })
  const org = orgSearch.find(org => org.parent_id === rootId)
  if (org === undefined) {
    app.log.info(`Organization's group ${organization} does not exist on Gitlab, creating one...`)
    const newOrg = await api.Groups.create(organization, organization, {
      parent_id: rootId,
      subgroup_creation_level: 'owner',
      project_creation_level: 'developer',
    })
    return newOrg.id
  }
  return org.id
}

export const createGroup = async (payload) => {
  try {
    const { organization, name, email } = payload.args
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
    const newOrg = await api.Groups.create(name, name, {
      parent_id: parentId,
      subgroup_creation_level: 'owner',
      project_creation_level: 'developer',
    })

    const getUsers = await api.Users.search(email)
    let giltabUser = getUsers.find(user => user.email === email)

    if (!giltabUser) {
      giltabUser = await api.Users.create({
        name: email.replace('@', '.'),
        username: email.replace('@', '.'),
        email,
        password: generate({
          length: 30,
          numbers: true,
        }),
        skip_confirmation: true,
      })
    }
    await addMemberToGroup(newOrg.id, giltabUser.id)
    console.log(giltabUser)
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
