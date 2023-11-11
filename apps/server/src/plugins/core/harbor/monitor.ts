import { MonitorInfos } from '@dso-console/shared'
import axios from 'axios'

const lastMonitor: MonitorInfos = {
  lastUpdate: new Date(),
  nextUpdate: new Date(),
  message: '',
  status: 0,
}

const monitorInterval = 5 * 60 * 1000

export const monitor = async (url: string, currentDate: Date, force: boolean) => {
  if ((currentDate < lastMonitor?.nextUpdate || !lastMonitor?.nextUpdate) && !force) {
    return lastMonitor
  }

  lastMonitor.lastUpdate = currentDate
  lastMonitor.nextUpdate = new Date(currentDate.getTime() + monitorInterval)
  try {
    const res = await axios.get(`${url}/api/v2.0/health`, {
      validateStatus: (code) => [200, 503].includes(code) || code < 500,
    })
    if (res.status === 200) {
      lastMonitor.status = 0
      lastMonitor.message = 'UP'
    } else if (res.status === 503) {
      lastMonitor.status = 1
      lastMonitor.message = 'Some components may be unavailable'
    } else throw Error('unknown return code')
  } catch (error) {
    console.log(`Unable to monitor ${url}, unknown error`)
    lastMonitor.status = 3
    lastMonitor.message = 'Unknown error while monitoring'
  }
  return lastMonitor
}
