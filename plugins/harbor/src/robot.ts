import { getApi } from './utils.js'
import { type Robot } from './api/Api.js'

export const createCiRobot = async (projectName: string) => {
  const api = getApi()
  const robot = await api.robots.createRobot({
    ...getRobotPermissions(projectName),
  })
  return robot.data
}

export const regenerateCiRobot = async (projectName: string) => {
  const api = getApi()
  const ciRobot = await getCiRobot(projectName)
  if (ciRobot?.id) await api.projects.deleteRobotV1(projectName, ciRobot.id)
  return createCiRobot(projectName)
}

export const getCiRobot = async (projectName: string) => getRobotByName(projectName, `robot$${projectName}+ci`)

export const getRobotByName = async (project: string | number, robotName: string): Promise<Robot | undefined> => {
  const api = getApi()
  const listRobots = await api.projects.listRobotV1(String(project))
  return listRobots.data.find(({ name }) => name === robotName)
}

const getRobotPermissions = (projectName: string) => {
  return {
    name: 'ci',
    duration: -1,
    description: 'robot for ci builds',
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
