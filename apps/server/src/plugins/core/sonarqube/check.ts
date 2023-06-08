import axios from 'axios'
import { axiosOptions } from './index.js'
import { PluginResult } from '@/types/index.js'

let status: PluginResult

const axiosInstance = axios.create(axiosOptions)

setInterval(async () => {
  status = await check()
}, 20000)

export const getStatus = async () => {
  if (!status?.result) {
    status = await check()
  }
  return status
}

export const check = async (): Promise<PluginResult> => {
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
        message: error.message,
      },
      updatedAt: Date.now(),
    }
  }
}
