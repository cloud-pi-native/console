import axios, { type CreateAxiosDefaults } from 'axios'
import { findGroupByName } from './group.js'
import { adminGroupPath, removeTrailingSlash } from '@dso-console/shared'
import { SonarApi } from './lib/index.js'

export const sonarqubeUrl = removeTrailingSlash(process.env.SONARQUBE_URL)
const token = process.env.SONAR_API_TOKEN

export const api = new SonarApi(sonarqubeUrl, token)

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

export const axiosOptions: CreateAxiosDefaults = {
  baseURL: `${sonarqubeUrl}/api/`,
  auth: {
    username: token,
    password: undefined, // Token is used, so password is useless
  },
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
}

export const axiosInstance = axios.create(axiosOptions)

export const initSonar = async () => {
  await setTemplatePermisions()
  await createAdminGroup()
  await setAdminPermisions()
}

const createAdminGroup = async () => {
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
