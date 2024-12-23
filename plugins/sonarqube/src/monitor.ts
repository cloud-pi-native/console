import { Monitor, type MonitorInfos, MonitorStatus } from '@cpn-console/shared'
import axios from 'axios'
import getConfig from './config.js'

const statusMap = {
  GREEN: MonitorStatus.OK,
  YELLOW: MonitorStatus.WARNING,
  RED: MonitorStatus.ERROR,
}
const messageMap = {
  GREEN: MonitorStatus.OK,
  YELLOW: 'Service dégradé',
  RED: 'Service en panne',
}
interface SonarRes {
  health: keyof typeof statusMap
  causes: string[]
}

async function monitor(instance: Monitor): Promise<MonitorInfos> {
  instance.lastStatus.lastUpdateTimestamp = (new Date()).getTime()
  try {
    const res = await axios.get('/system/health', {
      validateStatus: res => res === 200,
      ...getConfig().axiosOptions,
    })
    const data = res.data as SonarRes

    instance.lastStatus.status = statusMap[data.health]
    instance.lastStatus.message = messageMap[data.health]
    return instance.lastStatus
  } catch (error) {
    instance.lastStatus.message = 'Erreur lors la requête'
    instance.lastStatus.status = MonitorStatus.UNKNOW
    instance.lastStatus.cause = error
  }
  return instance.lastStatus
}

export default new Monitor(monitor)
