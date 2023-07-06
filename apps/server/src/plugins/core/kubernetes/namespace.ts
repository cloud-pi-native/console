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
        message: 'Failed',
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
        message: 'Failed',
      },
      error: JSON.stringify(error),
    }
  }
}

// API
export const createNamespace = async (kc: CoreV1Api, nsObject: V1Namespace) => {
  const nsName = nsObject.metadata.name
  try {
    const ns = await kc.readNamespace(nsName)
  } catch (error) {
    if (error.response.statusCode === 404) {
      await kc.createNamespace(nsObject)
      return
    }
    throw Error('Echec création namespace')
  }
}

export const deleteNamespace = async (kc: CoreV1Api, nsName: string) => {
  try {
    await kc.readNamespace(nsName)
    await kc.deleteNamespace(nsName)
  } catch (error) {
    if (error.response.statusCode !== 404) {
      throw error
    }
  }
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
  } as V1Namespace
}
