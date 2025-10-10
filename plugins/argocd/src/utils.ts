import { createHmac } from 'node:crypto'
import { CoreV1Api, CustomObjectsApi, KubeConfig } from '@kubernetes/client-node'
import { removeTrailingSlash, requiredEnv } from '@cpn-console/shared'
import type { ClusterObject, HookPayloadApis, ZoneObject } from '@cpn-console/hooks'
import { dump } from 'js-yaml'

export function generateAppProjectName(projectSlug: string, env: string) {
  const envHash = createHmac('sha256', '')
    .update(env)
    .digest('hex')
    .slice(0, 4)
  return `${projectSlug}-${env}-${envHash}`
}

export function generateApplicationName(projectSlug: string, env: string, repo: string) {
  const envHash = createHmac('sha256', '')
    .update(env)
    .digest('hex')
    .slice(0, 4)
  return `${projectSlug}-${env}-${repo}-${envHash}`
}

const config: {
  namespace?: string
  url?: string
} = {}

export function getConfig(): Required<typeof config> {
  config.namespace = config.namespace ?? requiredEnv('ARGO_NAMESPACE')
  config.url = removeTrailingSlash(requiredEnv('ARGOCD_URL'))

  // @ts-ignore
  return config
}

function getClient() {
  const kubeconfigCtx = process.env.KUBECONFIG_CTX
  const kubeconfigPath = process.env.KUBECONFIG_PATH
  const kc = new KubeConfig()
  if (kubeconfigPath) {
    kc.loadFromFile(kubeconfigPath)
    if (kubeconfigCtx) {
      kc.setCurrentContext(kubeconfigCtx)
    }
    return kc
  } else {
    kc.loadFromCluster()
  }
  return kc
}

let k8sApi: CoreV1Api | undefined
let customK8sApi: CustomObjectsApi | undefined

export function getK8sApi(): CoreV1Api {
  k8sApi = k8sApi ?? getClient().makeApiClient(CoreV1Api)
  return k8sApi
}

export function getCustomK8sApi(): CustomObjectsApi {
  customK8sApi = customK8sApi ?? getClient().makeApiClient(CustomObjectsApi)
  return customK8sApi
}

export async function updateZoneValues(zone: ZoneObject, apis: HookPayloadApis<ZoneObject> | HookPayloadApis<ClusterObject>) {
  const { gitlab, vault } = apis
  const values = {
    vault: await vault.getCredentials(),
    clusters: zone.clusterNames,
  }
  const zoneRepo = await gitlab.getOrCreateInfraProject(zone.slug)
  await gitlab.commitCreateOrUpdate(zoneRepo.id, dump(values), 'argocd-values.yaml')
  return {
    status: {
      result: 'OK',
      message: 'Zone argocd configuration created/updated',
    },
  }
}
