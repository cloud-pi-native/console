import { removeTrailingSlash, requiredEnv } from '@cpn-console/shared'
import type { RobotCreated } from './api/Api.js'
import { Api } from './api/Api.js'
import type { VaultRobotSecret } from './robot.js'

const config: {
  url?: string
  internalUrl?: string
  host?: string
} = {}

export function getConfig(): Required<typeof config> {
  config.url = config.url ?? removeTrailingSlash(requiredEnv('HARBOR_URL'))
  config.internalUrl = config.internalUrl ?? removeTrailingSlash(requiredEnv('HARBOR_INTERNAL_URL'))
  config.host = config.host ?? config?.internalUrl?.split('://')[1]
  // @ts-ignore
  return config
}

function getApiConfig() {
  return {
    auth: {
      username: requiredEnv('HARBOR_ADMIN'),
      password: requiredEnv('HARBOR_ADMIN_PASSWORD'),
    },
    baseURL: `${getConfig().internalUrl}/api/v2.0/`,
  }
}

let api: Api<ReturnType<typeof getApiConfig>> | undefined

export type HarborApi = Api<ReturnType<typeof getApiConfig>>
export function getApi(): HarborApi {
  if (!api) {
    api = new Api(getApiConfig())
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
