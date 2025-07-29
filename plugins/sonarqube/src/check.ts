import { type PluginResult, parseError } from '@cpn-console/hooks'
import { getAxiosInstance } from './tech'

let status: PluginResult

export async function getStatus() {
  if (!status?.result) {
    status = await check()
  }
  return status
}

export async function check(): Promise<PluginResult> {
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
      error: parseError(error),
      status: {
        result: 'KO',
        // @ts-ignore prévoir une fonction générique
        message: 'An unexpected error occured',
      },
      updatedAt: Date.now(),
    }
  }
}
