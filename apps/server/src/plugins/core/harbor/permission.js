import axios from 'axios'
import { axiosOptions } from './index.js'

export const addProjectMember = async (projectName, email, accessLevel = 3) => {
  const res = await axios({
    ...axiosOptions,
    url: `projects/${projectName}/members`,
    method: 'post',
    data: {
      role_id: accessLevel,
      member_user: {
        username: email,
      },
    },
  })
  return res.data
}
