import getConfig from './config.js'

let axiosOptions: {
  baseURL: string
  auth: {
    username: string
    password: string
  }
  headers: {
    Accept: string
  }
}

export function getAxiosOptions(): Required<typeof axiosOptions> {
  if (!axiosOptions) {
    axiosOptions = {
      baseURL: `${getConfig().internalUrl}/service/rest/v1/`,
      auth: {
        username: getConfig().user,
        password: getConfig().password,
      },
      headers: {
        Accept: 'application/json',
      },
    }
  }
  return axiosOptions
}
