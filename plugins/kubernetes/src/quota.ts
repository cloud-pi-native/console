import type { ResourceQuotaType } from '@dso-console/hooks'
import { CoreV1Api } from '@kubernetes/client-node'
import { ResourceQuota } from 'kubernetes-models/v1'

const resourceQuotaName = 'dso-quota'
// API
export const findResourceQuota = async (kc: CoreV1Api, nsName: string) => {
  const quotaList = await kc.listNamespacedResourceQuota(nsName, undefined, undefined, undefined, `metadata.name=${resourceQuotaName}`)
  // @ts-ignore
  return quotaList.body.items.find(quota => quota.metadata.name === resourceQuotaName)
}

export const createResourceQuota = async (kc: CoreV1Api, nsName: string, quota: ResourceQuotaType) => {
  const quotaObject = getQuotaObject(nsName, quota)
  // @ts-ignore
  await kc.createNamespacedResourceQuota(nsName, quotaObject)
}

export const replaceResourceQuota = async (kc: CoreV1Api, nsName: string, quota: ResourceQuotaType) => {
  const quotaObject = getQuotaObject(nsName, quota)
  // @ts-ignore
  await kc.replaceNamespacedResourceQuota(resourceQuotaName, nsName, quotaObject)
}

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
