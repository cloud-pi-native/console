import { StepCall } from '@/plugins/hooks/hook.js'
import { axiosOptions } from './index.js'
import axios from 'axios'
import { deleteProject } from './project.js'

export const purgeAll: StepCall<object> = async () => {
  const allProjects = await axios({
    ...axiosOptions,
    url: 'projects/',
    headers: {
      'X-Is-Resource-Name': true,
    },
    validateStatus: status => [200, 404].includes(status),
  })
  for (const project of allProjects.data) {
    await deleteProject(project.name)
  }
  return {
    status: {
      result: 'OK',
      message: 'Harbor projects deleted',
    },
  }
}
