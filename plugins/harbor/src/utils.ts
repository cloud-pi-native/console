import { removeTrailingSlash, requiredEnv } from '@cpn-console/shared'
import { Api, RobotCreated } from './api/Api.js'
import { VaultRobotSecret } from './robot.js'

const config: {
  url?: string
  host?: string
} = {}

export const getConfig = (): Required<typeof config> => {
  config.url = config.url ?? removeTrailingSlash(requiredEnv('HARBOR_URL'))
  config.host = config.host ?? config?.url?.split('://')[1]
  // @ts-ignore
  return config
}

const getApiConfig = () => {
  return {
    auth: {
      username: requiredEnv('HARBOR_ADMIN'),
      password: requiredEnv('HARBOR_ADMIN_PASSWORD'),
    },
    baseURL: `${getConfig().url}/api/v2.0/`,
  }
}

export let api: Api<ReturnType<typeof getApiConfig>> | undefined

export type HarborApi = Api<ReturnType<typeof getApiConfig>>
export const getApi = (): HarborApi => {
  if (api) return api
  api = new Api(getApiConfig())
  return api
}

export const toVaultSecret = (robot: Required<RobotCreated>): VaultRobotSecret => {
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
