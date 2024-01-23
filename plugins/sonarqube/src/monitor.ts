import { type MonitorInfos, MonitorStatus, Monitor } from '@dso-console/shared'
import axios from 'axios'
import { getAxiosOptions } from './tech.js'

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
type SonarRes = {
  health: keyof typeof statusMap
  causes: string[]
}

const monitor = async (instance: Monitor): Promise<MonitorInfos> => {
  instance.lastStatus.lastUpdateTimestamp = (new Date()).getTime()
  try {
    const res = await axios.get('/system/health', {
      validateStatus: (res) => res === 200,
      ...getAxiosOptions(),
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
