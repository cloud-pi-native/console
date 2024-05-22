import { HarborApi, toVaultSecret } from './utils.js'
import { RobotCreated, type Robot, type Access } from './api/Api.js'
import { VaultProjectApi } from '@cpn-console/vault-plugin/types/class.js'

export type VaultRobotSecret = {
  // {"auths":{"registry-host.com":{"auth":"<the TOKEN>","email":""}}},
  DOCKER_CONFIG: string
  // registry-host.com,
  HOST: string
  TOKEN: string,
  // robot$<project-name>+<robot-name>
  USERNAME: string
}

export const getRobot = async (projectName: string, robotName: string, api: HarborApi) => getRobotByName(projectName, `robot$${projectName}+${robotName}`, api)

export const ensureRobot = async (projectName: string, robotName: string, vaultApi: VaultProjectApi, access: Access[], api: HarborApi): Promise<VaultRobotSecret> => {
  const vaultPath = `REGISTRY/${robotName}`
  const robot = await getRobot(projectName, robotName, api)
  const VaultRobotSecret = await vaultApi.read(vaultPath, { throwIfNoEntry: false }) as { data: VaultRobotSecret } | undefined

  const creds: VaultRobotSecret = !VaultRobotSecret?.data
    ? robot
      ? toVaultSecret(await createRobot(projectName, robotName, access, api) as Required<RobotCreated>)
      : toVaultSecret(await regenerateRobot(projectName, robotName, access, api) as Required<RobotCreated>)
    : VaultRobotSecret.data
  await vaultApi.write(creds, vaultPath)
  return creds
}

export const deleteRobot = async (projectName: string, robotName: string, vaultApi: VaultProjectApi, api: HarborApi) => {
  const vaultPath = `REGISTRY/${robotName}`
  const robot = await getRobot(projectName, robotName, api)
  if (robot?.id) {
    api.robots.deleteRobot(robot.id)
  }
  const VaultRobotSecret = await vaultApi.read(vaultPath, { throwIfNoEntry: false }) as { data: VaultRobotSecret } | undefined

  if (VaultRobotSecret) {
    await vaultApi.destroy(vaultPath)
  }
}

export const createRobot = async (projectName: string, robotName: string, access: Access[], api: HarborApi) => {
  return (await api.robots.createRobot(getRobotPermissions(projectName, robotName, access))).data
}

export const regenerateRobot = async (projectName: string, robotName: string, access: Access[], api: HarborApi) => {
  const robot = await getRobot(projectName, robotName, api)
  if (robot?.id) await api.projects.deleteRobotV1(projectName, robot.id)
  return createRobot(projectName, robotName, access, api)
}

export const getRobotByName = async (project: string | number, robotName: string, api: HarborApi): Promise<Robot | undefined> => {
  const listRobots = await api.projects.listRobotV1(String(project))
  return listRobots.data.find(({ name }) => name === robotName)
}

const getRobotPermissions = (projectName: string, robotName: string, access: Access[]) => {
  return {
    name: robotName,
    duration: -1,
    description: 'robot for ci builds',
    disable: false,
    level: 'project',
    permissions: [{
      namespace: projectName,
      kind: 'project',
      access,
    }],
  }
}

export const roAccess: Access[] = [{
  resource: 'repository',
  action: 'pull',
}, {
  resource: 'artifact',
  action: 'read',
}]

export const rwAccess: Access[] = [...roAccess, {
  resource: 'repository',
  action: 'list',
}, {
  resource: 'tag',
  action: 'list',
}, {
  resource: 'artifact',
  action: 'list',
}, {
  resource: 'scan',
  action: 'create',
}, {
  resource: 'scan',
  action: 'stop',
}, {
  resource: 'repository',
  action: 'push',
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
}]
