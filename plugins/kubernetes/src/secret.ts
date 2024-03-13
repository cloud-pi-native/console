import { Secret } from 'kubernetes-models/v1'
import { CoreV1Api, V1ObjectMeta } from '@kubernetes/client-node'
import { createCoreV1Api } from './api.js'
import type { StepCall, EnvironmentCreateArgs } from '@cpn-console/hooks'
import { generateNamespaceName } from './namespace.js'

export type WithMetaType<CR extends object> = CR & {
  metadata: V1ObjectMeta & Required<Pick<V1ObjectMeta, 'name' | 'namespace'>>
};
// Plugin Function
export const createKubeSecret: StepCall<EnvironmentCreateArgs> = async (payload) => {
  try {
    // @ts-ignore to delete when in own plugin
    if (!payload.apis.vault) throw Error('no Vault available')
    const { organization, project, environment, cluster } = payload.args
    // @ts-ignore to delete when in own plugin
    const registrySecret = await payload.apis.vault.read('REGISTRY')

    const nsName = generateNamespaceName(organization, project, environment)
    const secret = getSecretObject(nsName, registrySecret.data)
    await createDockerConfigSecret(createCoreV1Api(cluster), secret)

    return {
      // @ts-ignore
      ...payload.results.kubernetes,
      status: {
        result: 'OK',
        message: 'Updated',
      },
    }
  } catch (error) {
    return {
      // @ts-ignore
      ...payload.results.kubernetes,
      status: {
        result: 'KO',
        message: 'Failed to create docker config secret',
      },
      error: JSON.stringify(error),
    }
  }
}

// API
export const createDockerConfigSecret = async (kc: CoreV1Api, secretObject: WithMetaType<Secret>) => {
  const nsName = secretObject.metadata.namespace
  const secretName = secretObject.metadata.name
  const secret = await kc.listNamespacedSecret(nsName, undefined, undefined, undefined, `metadata.name=${secretName}`)
  // @ts-ignore
  if (secret.body.items.length) await kc.replaceNamespacedSecret(secretName, nsName, secretObject)
  // @ts-ignore
  else await kc.createNamespacedSecret(nsName, secretObject)
}

// Utils
export const getSecretObject = (nsName: string, { DOCKER_CONFIG }: { DOCKER_CONFIG: string }): WithMetaType<Secret> => {
  const b64dockerConfig = Buffer.from(DOCKER_CONFIG).toString('base64')
  const secret = new Secret({
    data: {
      '.dockerconfigjson': b64dockerConfig,
    },
    type: 'kubernetes.io/dockerconfigjson',
    metadata: {
      name: 'registry-pull-secret',
      namespace: nsName,
    },
  })
  return secret as WithMetaType<Secret>
}
