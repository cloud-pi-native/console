import axios from 'axios'
import { axiosOptions } from './index.js'

export const createRobot = async (projectName) => {
  const rest = await axios({
    ...axiosOptions,
    url: 'robots',
    method: 'post',
    data: getRobotPermissions(projectName),
  })
  return rest.data
}

export const replaceRobot = async (projectName: string) => {
  // const getRobot = await axios({
  //   ...axiosOptions,
  //   url: 'robots',
  //   method: 'get',
  //   params: {
  //     name: projectName,
  //   },
  //   validateStatus: (code) => [200, 404].includes(code),
  // })

  // if (getRobot.status === 200) {
  // }
  const rest = await axios({
    ...axiosOptions,
    url: 'robots',
    method: 'put',
    data: getRobotPermissions(projectName),
  })
  return rest.data
}

export const getRobot = async (projectName) => {
  const rest = await axios({
    ...axiosOptions,
    url: 'robots',
    method: 'get',
    data: getRobotPermissions(projectName),
  })
  return rest.data
}

const getRobotPermissions = (projectName) => {
  return {
    name: 'ci',
    duration: -1,
    description: null,
    disable: false,
    level: 'project',
    permissions: [{
      namespace: projectName,
      kind: 'project',
      access: [{
        resource: 'repository',
        action: 'list',
      }, {
        resource: 'repository',
        action: 'pull',
      }, {
        resource: 'repository',
        action: 'push',
      }, {
        resource: 'repository',
        action: 'delete',
      }, {
        resource: 'artifact',
        action: 'read',
      }, {
        resource: 'artifact',
        action: 'list',
      }, {
        resource: 'artifact',
        action: 'delete',
      }, {
        resource: 'artifact-label',
        action: 'create',
      }, {
        resource: 'artifact-label',
        action: 'delete',
      }, {
        resource: 'tag',
        action: 'create',
      }, {
        resource: 'tag',
        action: 'delete',
      }, {
        resource: 'tag',
        action: 'list',
      }, {
        resource: 'scan',
        action: 'create',
      }, {
        resource: 'scan',
        action: 'stop',
      }, {
        resource: 'helm-chart',
        action: 'read',
      }, {
        resource: 'helm-chart-version',
        action: 'create',
      }, {
        resource: 'helm-chart-version',
        action: 'delete',
      }, {
        resource: 'helm-chart-version-label',
        action: 'create',
      }, {
        resource: 'helm-chart-version-label',
        action: 'delete',
      }],
    }],
  }
}
