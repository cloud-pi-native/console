import type { V1Namespace, CoreV1Api } from '@kubernetes/client-node'
import { UserModel } from 'shared'
import { createCoreV1Api } from './api.js'
import { HookPayload } from '@/plugins/hooks/hook.js'
import type { AddEnvironmentClusterExecArgs, RemoveEnvironmentClusterExecArgs } from '@/plugins/hooks/index.js'

// Plugins Functions
export const createKubeNamespace = async (payload: HookPayload<AddEnvironmentClusterExecArgs>) => {
  try {
    const { organization, project, environment, cluster, owner } = payload.args
    const nsObject = getNsObject(organization, project, environment, owner)
    await createNamespace(createCoreV1Api(cluster), nsObject)
    return {
      status: {
        result: 'OK',
        mainMessage: 'Namespace up-to-date',
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: 'Failed to create namespace',
      },
      error: JSON.stringify(error),
    }
  }
}

export const deleteKubeNamespace = async (payload: HookPayload<RemoveEnvironmentClusterExecArgs>) => {
  try {
    const { organization, project, environment, cluster } = payload.args

    const nsName = `${organization}-${project}-${environment}`
    await deleteNamespace(createCoreV1Api(cluster), nsName)
    return {
      status: {
        result: 'OK',
        mainMessage: 'Namespace deleted',
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: 'Failed to delete namespace',
      },
      error: JSON.stringify(error),
    }
  }
}

// API
export const createNamespace = async (kc: CoreV1Api, nsObject: V1Namespace) => {
  const nsName = nsObject.metadata.name
  const ns = await kc.listNamespace(undefined, undefined, undefined, `metadata.name=${nsName}`)
  if (!ns.body.items.length) await kc.createNamespace(nsObject)
}

export const deleteNamespace = async (kc: CoreV1Api, nsName: string) => {
  const ns = await kc.listNamespace(undefined, undefined, undefined, `metadata.name=${nsName}`)
  if (ns.body.items.length) await kc.deleteNamespace(nsName)
}

// Utils
export const getNsObject = (organization: string, projet: string, environment: string, owner: UserModel) => {
  return {
    metadata: {
      name: `${organization}-${projet}-${environment}`,
      labels: {
        'dso/organization': organization,
        'dso/projet': projet,
        'dso/environment': environment,
        'dso/owner.id': owner.id,
        // 'dso/owner.firstName': owner.firstName, // deactivate, need time to find a way to validate/transform specials chars
        // 'dso/owner.lastName': owner.lastName,
      },
    },
    kind: 'Namespace',
  }
}
