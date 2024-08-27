import { Monitor, type MonitorInfos, MonitorStatus, requiredEnv } from '@cpn-console/shared'
import axios from 'axios'

async function monitor(instance: Monitor): Promise<MonitorInfos> {
  instance.lastStatus.lastUpdateTimestamp = (new Date()).getTime()
  try {
    const res = await axios.get(requiredEnv('ARGOCD_URL'), {
      validateStatus: res => res === 200,
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
    instance.lastStatus.cause = error
  }
  return instance.lastStatus
}

export default new Monitor(monitor)
