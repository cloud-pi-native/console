import { type MonitorInfos, MonitorStatus, Monitor } from '@dso-console/shared'
import axios from 'axios'
import { getConfig } from './functions.js'

const coreComponents = [
  'Blob Stores Ready',
  'File Blob Stores Path',
  'Read-Only Detector',
]
const auxComponents = [
  'Blob Stores Quota',
  'Available CPUs',
  'File Descriptors',
  'Lifecycle Phase',
  'NuGet V2 repositories',
  'Scheduler',
  'Thread Deadlock Detector',
  'Transactions',
]

type NexusRes = Record<string, {
    'healthy': boolean,
    'message': string,
}>

const monitor = async (instance: Monitor): Promise<MonitorInfos> => {
  instance.lastStatus.lastUpdateTimestamp = (new Date()).getTime()
  try {
    const baseUrl = `${getConfig().url}/service/rest/v1`
    const status = await axios.get(`${baseUrl}/status`, {
      validateStatus: () => true,
    })
    const statusCheck = await axios.get(`${baseUrl}/status/check`, {
      validateStatus: (res) => [200, 503].includes(res),
    })
    const statusWritable = await axios.get(`${baseUrl}/status/writable`, {
      validateStatus: (res) => [200, 503].includes(res),
    })
    if (status.status === 503 || statusWritable.status === 503) {
      instance.lastStatus.status = MonitorStatus.ERROR
      instance.lastStatus.message = 'Nexus semble planté'
      return instance.lastStatus
    }
    if (statusCheck.status === 200) {
      const data = statusCheck.data as NexusRes
      if (coreComponents.some(name => !data[name].healthy)) {
        instance.lastStatus.status = MonitorStatus.ERROR
        instance.lastStatus.message = 'Des composants sont en erreur'
        return instance.lastStatus
      }
      if (auxComponents.some(name => !data[name].healthy)) {
        instance.lastStatus.status = MonitorStatus.ERROR
        instance.lastStatus.message = 'Le service est potentiellement dégradé'
        return instance.lastStatus
      }
    }
    instance.lastStatus.status = MonitorStatus.OK
    instance.lastStatus.message = MonitorStatus.OK
    return instance.lastStatus
  } catch (error) {
    instance.lastStatus.message = 'Erreur lors la requête'
    instance.lastStatus.status = MonitorStatus.UNKNOW
  }
  return instance.lastStatus
}

export default new Monitor(monitor)
