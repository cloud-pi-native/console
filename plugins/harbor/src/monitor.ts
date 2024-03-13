import { type MonitorInfos, MonitorStatus, Monitor } from '@cpn-console/shared'
import axios from 'axios'
import { getConfig } from './utils.js'

enum HealthStatus {
  healthy = 'healthy',
  unhealthy = 'unhealthy',
}
type HarborRes = {
  status: HealthStatus,
  components: Array<{ name: string, status: HealthStatus }>
}
const coreComponents = ['core', 'database', 'portal', 'registry', 'registryctl']

const monitor = async (instance: Monitor): Promise<MonitorInfos> => {
  instance.lastStatus.lastUpdateTimestamp = (new Date()).getTime()
  try {
    const res = await axios.get(`${getConfig().url}/api/v2.0/health`, {
      validateStatus: (res) => res === 200,
    })
    if (res.status === 200) { // 200 only means api responds
      const data = res.data as HarborRes
      if (data.status === HealthStatus.healthy) {
        instance.lastStatus.status = MonitorStatus.OK
        instance.lastStatus.message = MonitorStatus.OK
        return instance.lastStatus
      }
      const failedCoreComponents = data.components
        .filter(component =>
          component.status === HealthStatus.unhealthy &&
          coreComponents.includes(component.name),
        )

      if (failedCoreComponents.length > 0) {
        instance.lastStatus.status = MonitorStatus.ERROR
        instance.lastStatus.message = 'Service en erreur'
        return instance.lastStatus
      }
      instance.lastStatus.status = MonitorStatus.WARNING
      instance.lastStatus.message = 'Service dégradé'
      return instance.lastStatus
    }
    instance.lastStatus.status = MonitorStatus.ERROR
    instance.lastStatus.message = 'Fatal Error'
  } catch (error) {
    instance.lastStatus.message = 'Erreur lors la requête'
    instance.lastStatus.status = MonitorStatus.UNKNOW
    instance.lastStatus.cause = error
  }
  return instance.lastStatus
}

export default new Monitor(monitor)
