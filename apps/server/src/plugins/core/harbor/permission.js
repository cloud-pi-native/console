import axios from 'axios'
import { axiosOptions } from './index.js'

export const addProjectGroupMember = async (projectName, accessLevel = 3) => {
  const res = await axios({
    ...axiosOptions,
    url: `projects/${projectName}/members`,
    method: 'post',
    headers: {
      'X-Is-Resource-Name': false,
    },
    data: {
      role_id: accessLevel,
      member_group: {
        group_name: `${projectName}`,
        group_type: 3,
      },
    },
  })
  return res.data
}
