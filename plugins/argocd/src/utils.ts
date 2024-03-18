import { KubeConfig, CoreV1Api, CustomObjectsApi } from '@kubernetes/client-node'
import type { Environment, Organization, Project, RepositoryForEnv } from '@cpn-console/hooks'
import { removeTrailingSlash, requiredEnv } from '@cpn-console/shared'
import { createHmac } from 'crypto'

export const generateAppProjectName = (org: Organization, proj: Project, env: Environment) => {
  const envHash = createHmac('sha256', '')
    .update(env)
    .digest('hex')
    .slice(0, 4)
  return `${org}-${proj}-${env}-${envHash}`
}

export const generateApplicationName = (org: Organization, proj: Project, env: Environment, repo: RepositoryForEnv['internalRepoName']) => {
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

export const getConfig = (): Required<typeof config> => {
  config.namespace = config.namespace ?? requiredEnv('ARGO_NAMESPACE')
  config.url = removeTrailingSlash(requiredEnv('ARGOCD_URL'))

  // @ts-ignore
  return config
}

const getClient = () => {
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

export const getK8sApi = (): CoreV1Api => {
  k8sApi = k8sApi ?? getClient().makeApiClient(CoreV1Api)
  return k8sApi
}

export const getCustomK8sApi = (): CustomObjectsApi => {
  customK8sApi = customK8sApi ?? getClient().makeApiClient(CustomObjectsApi)
  return customK8sApi
}
