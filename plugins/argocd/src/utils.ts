import { createHmac } from 'node:crypto'
import { CoreV1Api, CustomObjectsApi, KubeConfig } from '@kubernetes/client-node'
import { removeTrailingSlash, requiredEnv } from '@cpn-console/shared'

export function generateAppProjectName(org: string, proj: string, env: string) {
  const envHash = createHmac('sha256', '')
    .update(env)
    .digest('hex')
    .slice(0, 4)
  return `${org}-${proj}-${env}-${envHash}`
}

export function generateApplicationName(org: string, proj: string, env: string, repo: string) {
  const envHash = createHmac('sha256', '')
    .update(env)
    .digest('hex')
    .slice(0, 4)
  return `${org}-${proj}-${env}-${repo}-${envHash}`
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

/**
 * Take a list of list of kubernetes resources and and ditch duplicates by name
 *
 * @remarks Kind is ignored. You can pass as many arguments as you want
 *
 * @example
 * ```ts
 * const foo = [{ metadata: { name: 'One' }}, { metadata: { name: 'Two' }}]
 * const bar = [{ metadata: { name: 'One' }}, { metadata: { name: 'Three' }}]
 * const xyz = [{ metadata: { name: 'Four' }}, { metadata: { name: 'Two' }}]
 * uniqueResource(foo, bar, xyz)
 * // [
 * //   { metadata: { name: 'One' }},
 * //   { metadata: { name: 'Two' }},
 * //   { metadata: { name: 'Three' }},
 * //   { metadata: { name: 'Four' }}
 * // ]
 * ```
 *
 */
export function uniqueResource<T extends { metadata: { name: string } }>(...lists: T[][]): T[] {
  return lists
    .flat()
    .reduce((acc, cur) => (acc.some(item => item.metadata.name === cur.metadata.name)
      ? acc
      : [...acc, cur]
    ), [] as T[])
}

export interface BaseResources {
  kind?: string
  apiVersion?: string
  metadata: {
    name?: string
    namespace?: string
    labels: {
      [x: string]: string
    }
    [x: string]: any
  }
  [x: string]: any
}
