import { ResourceQuota } from '@/plugins/hooks/environment.js'
import { CoreV1Api, V1ResourceQuota } from '@kubernetes/client-node'

const resourceQuotaName = 'dso-quota'
// API
export const findResourceQuota = async (kc: CoreV1Api, nsName: string) => {
  const quotaList = await kc.listNamespacedResourceQuota(nsName, undefined, undefined, undefined, `metadata.name=${resourceQuotaName}`)
  return quotaList.body.items.find(quota => quota.metadata.name === resourceQuotaName)
}

export const createResourceQuota = async (kc: CoreV1Api, nsName: string, quota: ResourceQuota) => {
  const quotaObject = getQuotaObject(nsName, quota)
  await kc.createNamespacedResourceQuota(nsName, quotaObject)
}

export const replaceResourceQuota = async (kc: CoreV1Api, nsName: string, quota: ResourceQuota) => {
  const quotaObject = getQuotaObject(nsName, quota)
  await kc.replaceNamespacedResourceQuota(resourceQuotaName, nsName, quotaObject)
}

// Utils
export const getQuotaObject = (nsName: string, quota: ResourceQuota): V1ResourceQuota => {
  return {
    apiVersion: 'v1',
    kind: 'ResourceQuota',
    metadata: {
      name: resourceQuotaName,
      namespace: nsName,
      labels: {
        'app.kubernetes.io/managed-by': 'dso-console',
      },
    },
    spec: {
      hard: {
        'limits.cpu': String(quota.cpu),
        'limits.memory': quota.memory,
        'request.cpu': String(quota.cpu),
        'request.memory': quota.memory,
      },
    },
  }
}
