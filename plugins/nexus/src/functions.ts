import { removeTrailingSlash, requiredEnv } from '@dso-console/shared'

const config: {
  url?: string
  user?: string
  password?: string
} = {}

export const getConfig = (): Required<typeof config> => {
  config.password = requiredEnv('NEXUS_ADMIN_PASSWORD')
  config.user = requiredEnv('NEXUS_ADMIN')
  config.url = removeTrailingSlash(requiredEnv('NEXUS_URL'))
  // @ts-ignore
  return config
}
export let axiosOptions: {
    baseURL: string
    auth: {
        username: string;
        password: string;
    };
    headers: {
        Accept: string;
    };
}

export const getAxiosOptions = (): Required<typeof axiosOptions> => {
  axiosOptions = {
    baseURL: `${getConfig().url}/service/rest/v1/`,
    auth: {
      username: getConfig().user,
      password: getConfig().password,
    },
    headers: {
      Accept: 'application/json',
    },
  }
  return axiosOptions
}
