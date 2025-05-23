import { Monitor, type MonitorInfos, MonitorStatus } from '@cpn-console/shared'
import axios from 'axios'
import { getAxiosOptions } from './functions.js'

const coreComponents = [
  'Blob Stores Ready',
  'File Blob Stores Path',
  'Read-Only Detector',
]
const auxComponents = [
  'Available CPUs',
  'Blob Stores Quota',
  'File Descriptors',
  'NuGet V2 repositories',
  'Scheduler',
  'Thread Deadlock Detector',
  'Read-Only Detector',
  'Default Admin Credentials',
]

type NexusRes = Record<string, {
  healthy: boolean
  message: string
}>

async function monitor(instance: Monitor): Promise<MonitorInfos> {
  instance.lastStatus.lastUpdateTimestamp = (new Date()).getTime()
  try {
    const status = await axios.get('/status', {
      validateStatus: () => true,
      ...getAxiosOptions(),
    })
    const statusCheck = await axios.get('/status/check', {
      validateStatus: res => [200, 503].includes(res),
      ...getAxiosOptions(),
    })
    const statusWritable = await axios.get('/status/writable', {
      validateStatus: res => [200, 503].includes(res),
      ...getAxiosOptions(),
    })
    if (status.status === 503 || statusWritable.status === 503) {
      instance.lastStatus.status = MonitorStatus.ERROR
      instance.lastStatus.message = 'Nexus semble planté'
      return instance.lastStatus
    }
    if (statusCheck.status === 200) {
      const data = statusCheck.data as NexusRes

      const failedCoreComponents = coreComponents.filter(component => !data[component]?.healthy)
      const failedAuxComponents = auxComponents.filter(component => !data[component]?.healthy)
      if (failedAuxComponents.length || failedCoreComponents.length) {
        instance.lastStatus.status = failedCoreComponents.length
          ? MonitorStatus.ERROR
          : MonitorStatus.WARNING
        instance.lastStatus.message = failedCoreComponents.length
          ? 'Des composants critiques sont en erreur'
          : 'Le service est partiellement dégradé'

        instance.lastStatus.cause = `Les composants suivants sont en erreurs: ${failedCoreComponents.concat(failedAuxComponents).join(', ')}`
        return instance.lastStatus
      }
    }
    instance.lastStatus.status = MonitorStatus.OK
    instance.lastStatus.message = MonitorStatus.OK
    return instance.lastStatus
  } catch (error) {
    instance.lastStatus.message = 'Erreur lors la requête'
    instance.lastStatus.status = MonitorStatus.UNKNOW
    instance.lastStatus.cause = error
  }
  return instance.lastStatus
}

export default new Monitor(monitor)
