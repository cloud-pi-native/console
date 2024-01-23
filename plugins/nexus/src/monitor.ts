import { type MonitorInfos, MonitorStatus, Monitor } from '@dso-console/shared'
import axios from 'axios'
import { getAxiosOptions } from './functions.js'

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
    const status = await axios.get('/status', {
      validateStatus: () => true,
      ...getAxiosOptions(),
    })
    const statusCheck = await axios.get('/status/check', {
      validateStatus: (res) => [200, 503].includes(res),
      ...getAxiosOptions(),
    })
    const statusWritable = await axios.get('/status/writable', {
      validateStatus: (res) => [200, 503].includes(res),
      ...getAxiosOptions(),
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
        instance.lastStatus.cause = data
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
