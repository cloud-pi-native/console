import type { RobotCreated } from './api/Api.js'
import { Api } from './api/Api.js'
import type { VaultRobotSecret } from './robot.js'
import getConfig from './config.js'

let api: Api<ReturnType<typeof getConfig>['apiConfig']> | undefined

export type HarborApi = Api<ReturnType<typeof getConfig>['apiConfig']>
export function getApi(): HarborApi {
  if (!api) {
    api = new Api(getConfig().apiConfig)
  }
  return api
}

export function toVaultSecret(robot: Required<RobotCreated>): VaultRobotSecret {
  const auth = `${robot.name}:${robot.secret}`
  const buff = Buffer.from(auth)
  const b64auth = buff.toString('base64')
  return {
    DOCKER_CONFIG: JSON.stringify({
      auths: {
        [getConfig().host]: {
          auth: b64auth,
          email: '',
        },
      },
    }),
    HOST: getConfig().host,
    TOKEN: robot.secret,
    USERNAME: robot.name,
  }
}

export const rwRobotName = 'rw-robot'
export const roRobotName = 'ro-robot'
export const projectRobotName = 'project-robot'
