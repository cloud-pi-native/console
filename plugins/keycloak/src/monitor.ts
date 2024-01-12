import { type MonitorInfos, MonitorStatus, requiredEnv, Monitor } from '@dso-console/shared'
import axios from 'axios'

const monitor = async (instance: Monitor): Promise<MonitorInfos> => {
  instance.lastStatus.lastUpdateTimestamp = (new Date()).getTime()
  try {
    const res = await axios.get(`${requiredEnv('HARBOR_URL')}/api/v2.0/health`, {
      validateStatus: (res) => res === 200,
    })
    if (res.status === 200) { // 200 only means api responds
      instance.lastStatus.status = MonitorStatus.OK
      instance.lastStatus.message = MonitorStatus.OK
      return instance.lastStatus
    }
    instance.lastStatus.status = MonitorStatus.ERROR
    instance.lastStatus.message = 'Service en erreur'
    return instance.lastStatus
  } catch (error) {
    instance.lastStatus.message = 'Erreur lors la requête'
    instance.lastStatus.status = MonitorStatus.UNKNOW
  }
  return instance.lastStatus
}

export default new Monitor(monitor)
