import { Secret } from 'kubernetes-models/v1'
import type { CoreV1Api, V1ObjectMeta } from '@kubernetes/client-node'

export type WithMetaType<CR extends object> = CR & {
  metadata: V1ObjectMeta & Required<Pick<V1ObjectMeta, 'name' | 'namespace'>>
}

// API
export async function createDockerConfigSecret(kc: CoreV1Api, secretObject: WithMetaType<Secret>) {
  const nsName = secretObject.metadata.namespace
  const secretName = secretObject.metadata.name
  const secret = await kc.listNamespacedSecret(nsName, undefined, undefined, undefined, `metadata.name=${secretName}`)
  // @ts-ignore
  if (secret.body.items.length)
    await kc.replaceNamespacedSecret(secretName, nsName, secretObject)
  // @ts-ignore
  else await kc.createNamespacedSecret(nsName, secretObject)
}

// Utils
export function getSecretObject(nsName: string, { DOCKER_CONFIG }: { DOCKER_CONFIG: string }): WithMetaType<Secret> {
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
