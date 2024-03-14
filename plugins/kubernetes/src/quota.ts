import type { ResourceQuotaType } from '@cpn-console/hooks'
import { ResourceQuota } from 'kubernetes-models/v1'

const resourceQuotaName = 'dso-quota'

// Utils
export const getQuotaObject = (nsName: string, quota: ResourceQuotaType): ResourceQuota => {
  return new ResourceQuota({
    metadata: {
      name: resourceQuotaName,
      namespace: nsName,
      labels: {
        'app.kubernetes.io/managed-by': 'dso-console',
      },
    },
    spec: {
      hard: {
        'requests.cpu': String(quota.cpu),
        'requests.memory': quota.memory,
        'limits.cpu': String(quota.cpu),
        'limits.memory': quota.memory,
      },
    },
  })
}
