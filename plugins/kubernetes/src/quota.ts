import type { Environment } from '@cpn-console/hooks'
import { ResourceQuota } from 'kubernetes-models/v1'

const resourceQuotaName = 'dso-quota'

// Utils
export function getQuotaObject(nsName: string, env: Environment): ResourceQuota {
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
        'requests.cpu': String(env.cpu),
        'requests.memory': env.memory,
        'limits.cpu': String(env.cpu),
        'limits.memory': env.memory,
      },
    },
  })
}
