import { type MonitorInfos, MonitorStatus, requiredEnv, Monitor } from '@dso-console/shared'
import axios from 'axios'

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

const monitor = async (instance: Monitor): Promise<MonitorInfos> => {
  instance.lastStatus.lastUpdateTimestamp = (new Date()).getTime()
  try {
    const res = await axios.get(`${requiredEnv('VAULT_URL')}v1/sys/health`, {
      headers: {
        'X-Vault-Token': requiredEnv('VAULT_TOKEN'),
      },
      validateStatus: (res) => vaultStatusCode.includes(res),
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
