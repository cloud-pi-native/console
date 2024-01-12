import { findGroupByName } from './group.js'
import { adminGroupPath } from '@dso-console/shared'
import { getAxiosInstance } from './tech.js'

const globalPermissions = [
  'admin',
  'profileadmin',
  'gateadmin',
  'scan',
  'provisioning',
]

const projectPermissions = [
  'admin',
  'codeviewer',
  'issueadmin',
  'securityhotspotadmin',
  'scan',
  'user',
]

export const initSonar = async () => {
  await setTemplatePermisions()
  await createAdminGroup()
  await setAdminPermisions()
}

const createAdminGroup = async () => {
  const axiosInstance = getAxiosInstance()
  const adminGroup = await findGroupByName(adminGroupPath)
  if (!adminGroup) {
    await axiosInstance({
      method: 'post',
      params: {
        name: adminGroupPath,
        description: 'DSO platform admins',
      },
      url: 'user_groups/create',
    })
  }
}

const setAdminPermisions = async () => {
  const axiosInstance = getAxiosInstance()
  for (const permission of globalPermissions) {
    await axiosInstance({
      method: 'post',
      params: {
        groupName: adminGroupPath,
        permission,
      },
      url: 'permissions/add_group',
    })
  }
}

const setTemplatePermisions = async () => {
  const axiosInstance = getAxiosInstance()
  await axiosInstance({
    method: 'post',
    params: { name: 'Forge Default' },
    url: 'permissions/create_template',
    validateStatus: (code) => [200, 400].includes(code),
  })
  for (const permission of projectPermissions) {
    await axiosInstance({
      method: 'post',
      params: {
        templateName: 'Forge Default',
        permission,
      },
      url: 'permissions/add_project_creator_to_template',
    })
    await axiosInstance({

      method: 'post',
      params: {
        groupName: 'sonar-administrators',
        templateName: 'Forge Default',
        permission,
      },
      url: 'permissions/add_group_to_template',
    })
  }
  await axiosInstance({
    method: 'post',
    params: {
      templateName: 'Forge Default',
    },
    url: 'permissions/set_default_template',
  })
}
