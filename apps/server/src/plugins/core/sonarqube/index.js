import axios from 'axios'
import { sonarqubeUrl, sonarqubeApiToken as username } from '../../../utils/env.js'

export const axiosOptions = {
  baseURL: `${sonarqubeUrl}api/`,
  auth: {
    username,
  },
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
}

export const initSonar = async () => {
  await axios({
    ...axiosOptions,
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
    await axios({
      ...axiosOptions,
      method: 'post',
      params: {
        templateName: 'Forge Default',
        permission,
      },
      url: 'permissions/add_project_creator_to_template',
    })
    await axios({
      ...axiosOptions,
      method: 'post',
      params: {
        groupName: 'sonar-administrators',
        templateName: 'Forge Default',
        permission,
      },
      url: 'permissions/add_group_to_template',
    })
  }
  await axios({
    ...axiosOptions,
    method: 'post',
    params: {
      templateName: 'Forge Default',
    },
    url: 'permissions/set_default_template',
  })
}
