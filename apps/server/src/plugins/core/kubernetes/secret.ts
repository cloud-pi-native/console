import type { CoreV1Api, V1Secret } from '@kubernetes/client-node'
import { createCoreV1Api } from './api.js'
import { HookPayload } from '@/plugins/hooks/hook.js'
import type { AddEnvironmentClusterExecArgs } from '@/plugins/hooks/index.js'

// Plugin Function
export const createKubeSecret = async (payload: HookPayload<AddEnvironmentClusterExecArgs>) => {
  try {
    const { organization, project, environment, cluster } = payload.args
    // @ts-ignore
    const registrySecret = payload.vault.pullSecret.data
    const nsName = `${organization}-${project}-${environment}`
    const secret = getSecretObject(nsName, registrySecret)
    await createDockerConfigSecret(createCoreV1Api(cluster), secret)

    return {
      // @ts-ignore
      ...payload.kubernetes,
      status: {
        result: 'OK',
        message: 'Updated',
      },
    }
  } catch (error) {
    return {
      // @ts-ignore
      ...payload.kubernetes,
      status: {
        result: 'KO',
        message: 'Failed to create docker config secret',
      },
      error,
    }
  }
}

// API
export const createDockerConfigSecret = async (kc: CoreV1Api, secretObject: V1Secret) => {
  const nsName = secretObject.metadata.namespace
  const secretName = secretObject.metadata.name
  const secret = await kc.listNamespacedSecret(nsName, undefined, undefined, undefined, `metadata.name=${secretName}`)
  if (secret.body.items.length) await kc.replaceNamespacedSecret(secretName, nsName, secretObject)
  else await kc.createNamespacedSecret(nsName, secretObject)
}

// Utils
export const getSecretObject = (nsName: string, { DOCKER_CONFIG }: { DOCKER_CONFIG: string }) => {
  const b64dockerConfig = Buffer.from(DOCKER_CONFIG).toString('base64')
  return {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: 'registry-pull-secret',
      namespace: nsName,
    },
    data: { '.dockerconfigjson': b64dockerConfig },
    type: 'kubernetes.io/dockerconfigjson',
  } as V1Secret
}
