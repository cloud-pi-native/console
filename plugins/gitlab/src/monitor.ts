import { type MonitorInfos, MonitorStatus, requiredEnv, Monitor } from '@cpn-console/shared'
import axios from 'axios'

enum HealthStatus {
  failed = 'failed',
  ok = 'ok',
}
type GitlabRes = Record<string, { status: HealthStatus, labels: Record<string, string> }>
const coreComponents = ['gitaly_check', 'master_check', 'db_check', 'sessions_check']

const monitor = async (instance: Monitor): Promise<MonitorInfos> => {
  instance.lastStatus.lastUpdateTimestamp = (new Date()).getTime()
  try {
    const res = await axios.get(`${requiredEnv('GITLAB_URL')}/-/readiness?all=1`, {
      validateStatus: res => res === 200,
    })
    if (res.status === 200) { // 200 only means api responds
      const data = res.data as GitlabRes
      const failedComponents = Object.entries(data)
        .reduce((acc, [name, value]) => {
          if (value.status === HealthStatus.failed) return [...acc, name]
          return acc
        }, [] as string[])
      const failedCoreComponents = failedComponents.filter(name => coreComponents.includes(name))

      if (failedCoreComponents.length > 0) {
        instance.lastStatus.status = MonitorStatus.ERROR
        instance.lastStatus.message = 'Service en erreur'
        return instance.lastStatus
      }
      if (failedComponents.length > 0) {
        instance.lastStatus.status = MonitorStatus.WARNING
        instance.lastStatus.message = 'Service dégradé'
        return instance.lastStatus
      }
      instance.lastStatus.status = MonitorStatus.OK
      instance.lastStatus.message = MonitorStatus.OK
      return instance.lastStatus
    }
    instance.lastStatus.status = MonitorStatus.ERROR
    instance.lastStatus.message = 'Fatal Error'
  }
  catch (error) {
    instance.lastStatus.message = 'Erreur lors la requête'
    instance.lastStatus.status = MonitorStatus.UNKNOW
    instance.lastStatus.cause = error
  }
  return instance.lastStatus
}

export default new Monitor(monitor)
