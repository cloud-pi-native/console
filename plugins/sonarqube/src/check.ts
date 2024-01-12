import { type PluginResult } from '@dso-console/hooks'
import { getAxiosInstance } from './tech.js'

let status: PluginResult

export const getStatus = async () => {
  if (!status?.result) {
    status = await check()
  }
  return status
}

export const check = async (): Promise<PluginResult> => {
  const axiosInstance = getAxiosInstance()

  try {
    const health = await axiosInstance({
      url: 'system/info',
    })
    const res: PluginResult = {
      status: {
        result: 'OK',
      },
    }

    if (health.data.Health === 'RED') {
      res.status.result = 'KO'
    }
    if (health.data['Health Causes']) {
      res.status.message = health.data['Health Causes'].join('\n')
    }

    return res
  } catch (error) {
    return {
      status: {
        result: 'KO',
        // @ts-ignore prévoir une fonction générique
        message: error.message,
      },
      updatedAt: Date.now(),
    }
  }
}
