import { MonitorInfos } from '@dso-console/shared'
import axios from 'axios'

const monitorInterval = 5 * 60 * 1000

export const getMonitorObject = () => structuredClone({
  lastUpdate: new Date(),
  nextUpdate: new Date(),
  message: '',
  status: 0,
}) as MonitorInfos

export const monitor = async (url: string, currentDate: Date, force: boolean, lastMonitor: MonitorInfos) => {
  if ((currentDate > lastMonitor.nextUpdate) && !force) {
    return lastMonitor
  }

  lastMonitor.lastUpdate = currentDate
  lastMonitor.nextUpdate = new Date(currentDate.getTime() + monitorInterval)
  try {
    const res = await axios.get(url, {
      validateStatus: () => true,
    })
    if (res.status > 400) {
      lastMonitor.status = 2
      lastMonitor.message = 'DOWN'
    } else {
      lastMonitor.status = 0
      lastMonitor.message = 'UP'
    }
  } catch (error) {
    console.log(`Unable to monitor ${url}, unknown error`)
    lastMonitor.status = 3
    lastMonitor.message = 'Unknown error while monitoring'
  }
  return lastMonitor
}
