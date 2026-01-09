import type { VaultProjectApi } from '@cpn-console/vault-plugin/types/vault-project-api.js'
import type { HarborApi } from './utils.js'
import { getConfig, toVaultSecret } from './utils.js'
import type { Access, Robot, RobotCreated } from './api/Api.js'

export interface VaultRobotSecret {
  // {"auths":{"registry-host.com":{"auth":"<the TOKEN>","email":""}}},
  DOCKER_CONFIG: string
  // registry-host.com,
  HOST: string
  TOKEN: string
  // robot$<project-name>+<robot-name>
  USERNAME: string
}

export const getRobot = async (projectName: string, robotName: string, api: HarborApi) => getRobotByName(projectName, `robot$${projectName}+${robotName}`, api)

export async function ensureRobot(projectName: string, robotName: string, vaultApi: VaultProjectApi, access: Access[], api: HarborApi): Promise<VaultRobotSecret> {
  const vaultPath = `REGISTRY/${robotName}`
  const robot = await getRobot(projectName, robotName, api)
  const vaultRobotSecret = await vaultApi.read(vaultPath, { throwIfNoEntry: false }) as { data: VaultRobotSecret } | undefined

  let creds: VaultRobotSecret
  // only regenerate robot if there is a change with the host
  if (vaultRobotSecret?.data && vaultRobotSecret.data.HOST === getConfig().host) {
    creds = vaultRobotSecret.data
  } else if (robot) {
    creds = toVaultSecret(await regenerateRobot(projectName, robotName, access, api) as Required<RobotCreated>)
    await vaultApi.write(creds, vaultPath)
  } else {
    creds = toVaultSecret(await createRobot(projectName, robotName, access, api) as Required<RobotCreated>)
    await vaultApi.write(creds, vaultPath)
  }
  return creds
}

export async function deleteRobot(projectName: string, robotName: string, vaultApi: VaultProjectApi, api: HarborApi) {
  const vaultPath = `REGISTRY/${robotName}`
  const robot = await getRobot(projectName, robotName, api)
  if (robot?.id) {
    api.robots.deleteRobot(robot.id)
  }
  const vaultRobotSecret = await vaultApi.read(vaultPath, { throwIfNoEntry: false }) as { data: VaultRobotSecret } | undefined

  if (vaultRobotSecret) {
    await vaultApi.destroy(vaultPath)
  }
}

export async function createRobot(projectName: string, robotName: string, access: Access[], api: HarborApi) {
  return (await api.robots.createRobot(getRobotPermissions(projectName, robotName, access))).data
}

export async function regenerateRobot(projectName: string, robotName: string, access: Access[], api: HarborApi) {
  const robot = await getRobot(projectName, robotName, api)
  if (robot?.id)
    await api.projects.deleteRobotV1(projectName, robot.id)
  return createRobot(projectName, robotName, access, api)
}

export async function getRobotByName(project: string | number, robotName: string, api: HarborApi): Promise<Robot | undefined> {
  const listRobots = await api.projects.listRobotV1(String(project))
  return listRobots.data.find(({ name }) => name === robotName)
}

function getRobotPermissions(projectName: string, robotName: string, access: Access[]) {
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
