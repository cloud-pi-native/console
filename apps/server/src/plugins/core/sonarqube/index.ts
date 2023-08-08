import axios, { type CreateAxiosDefaults } from 'axios'
import { sonarqubeUrl, sonarqubeApiToken as username } from '@/utils/env.js'

export const axiosOptions: CreateAxiosDefaults = {
  baseURL: `${sonarqubeUrl}/api/`,
  auth: {
    username,
    password: undefined, // Token is used, so password is useless
  },
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
}

const axiosInstance = axios.create(axiosOptions)

export const initSonar = async () => {
  await axiosInstance({
    method: 'post',
    params: { name: 'Forge Default' },
    url: 'permissions/create_template',
    validateStatus: (code) => [200, 400].includes(code),
  })
  const permissions = [
    'admin',
    'codeviewer',
    'issueadmin',
    'securityhotspotadmin',
    'scan',
    'user',
  ]
  for (const permission of permissions) {
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
