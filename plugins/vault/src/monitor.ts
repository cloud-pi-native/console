import { Monitor, type MonitorInfos, MonitorStatus } from '@cpn-console/shared'
import axios from 'axios'
import getConfig from './config.js'

const vaultStatusCode = [200, 429, 472, 473, 501, 503]

type VaultRes = {
  initialized: boolean
  sealed: boolean
  standby: boolean
  performance_standby: boolean
  replication_performance_mode: string
  replication_dr_mode: string
  server_time_utc: number
  version: string
} | undefined

async function monitor(instance: Monitor): Promise<MonitorInfos> {
  instance.lastStatus.lastUpdateTimestamp = (new Date()).getTime()
  try {
    const res = await axios.get(`${getConfig().internalUrl}/v1/sys/health?standbyok=true`, {
      headers: {
        'X-Vault-Token': getConfig().token,
      },
      validateStatus: res => vaultStatusCode.includes(res),
    })
    if (res.status === 200) {
      instance.lastStatus.status = MonitorStatus.OK
      instance.lastStatus.message = MonitorStatus.OK
    } else {
      instance.lastStatus.status = MonitorStatus.ERROR
      const data = res.data as VaultRes
      instance.lastStatus.message = data?.sealed ? 'Le Vault est scellé' : 'Vault en erreur'
    }
  } catch (error) {
    instance.lastStatus.message = 'Error lors la requete'
    instance.lastStatus.status = MonitorStatus.UNKNOW
    instance.lastStatus.cause = error
    // test
  }
  return instance.lastStatus
}

export default new Monitor(monitor)
