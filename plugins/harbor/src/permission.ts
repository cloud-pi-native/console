import axios from 'axios'
import { getAxiosOptions } from './functions.js'

/**
 *
 * @param {String} projectName - The name of harbor project which is tha same as keycloak group
 * @param {Number} accessLevel - By default 3 (guest)
 * @returns {Promise}
 */
export const addProjectGroupMember = async (projectName: string, accessLevel = 3) => {
  const members: Record<string, string | number>[] = (await axios({
    ...getAxiosOptions(),
    url: `projects/${projectName}/members`,
    method: 'get',
    headers: {
      'X-Is-Resource-Name': false,
    },
  }))?.data
  const member = members.find(m => m.entity_name === projectName)
  if (!member) {
    await axios({
      ...getAxiosOptions(),
      url: `projects/${projectName}/members`,
      method: 'post',
      headers: {
        'X-Is-Resource-Name': false,
      },
      data: {
        role_id: accessLevel,
        member_group: {
          group_name: `/${projectName}`,
          group_type: 3,
        },
      },
    })
  }
}
