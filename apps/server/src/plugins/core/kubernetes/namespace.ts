import type { V1Namespace, CoreV1Api } from '@kubernetes/client-node'
import { UserModel } from '@dso-console/shared'
import { createCoreV1Api } from './api.js'
import type { StepCall } from '@/plugins/hooks/hook.js'
import type { Environment, EnvironmentCreateArgs, EnvironmentDeleteArgs, EnvironmentQuotaUpdateArgs, Organization, Project, ResourceQuota } from '@/plugins/hooks/index.js'
import { createResourceQuota, findResourceQuota, replaceResourceQuota } from './quota.js'
import { createHmac } from 'node:crypto'

// Plugins Functions
export const createKubeNamespace: StepCall<EnvironmentCreateArgs> = async (payload) => {
  try {
    const { organization, project, environment, cluster, owner, quota } = payload.args
    const nsObject = getNsObject(organization, project, environment, owner)
    const kubeClient = createCoreV1Api(cluster)
    await createNamespace(kubeClient, nsObject, quota)

    return {
      status: {
        result: 'OK',
        message: 'Namespace up-to-date',
      },
      nsName: nsObject.metadata.name,
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: 'Failed to create namespace or resourcequota',
      },
      error: JSON.stringify(error),
    }
  }
}

export const updateResourceQuota: StepCall<EnvironmentQuotaUpdateArgs> = async (payload) => {
  try {
    const { organization, project, environment, cluster, quota } = payload.args
    const nsName = generateNamespaceName(organization, project, environment)
    const kubeClient = createCoreV1Api(cluster)
    const existingQuota = await findResourceQuota(kubeClient, nsName)
    if (!existingQuota) await createResourceQuota(kubeClient, nsName, quota)
    else await replaceResourceQuota(kubeClient, nsName, quota)

    return {
      status: {
        result: 'OK',
        message: 'ResourceQuota updated',
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: 'Failed to update ResourceQuota',
      },
      error: JSON.stringify(error),
    }
  }
}

export const deleteKubeNamespace: StepCall<EnvironmentDeleteArgs> = async (payload) => {
  try {
    const { organization, project, environment, cluster } = payload.args

    const nsName = generateNamespaceName(organization, project, environment)
    await deleteNamespace(createCoreV1Api(cluster), nsName)
    return {
      status: {
        result: 'OK',
        message: 'Namespace deleted',
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
export const createNamespace = async (kc: CoreV1Api, nsObject: V1Namespace, quota: ResourceQuota) => {
  const nsName = nsObject.metadata.name
  const ns = await kc.listNamespace(undefined, undefined, undefined, `metadata.name=${nsName}`)
  if (!ns.body.items.length) {
    await kc.createNamespace(nsObject)
    await createResourceQuota(kc, nsName, quota)
  }
}

export const deleteNamespace = async (kc: CoreV1Api, nsName: string) => {
  const ns = await kc.listNamespace(undefined, undefined, undefined, `metadata.name=${nsName}`)
  if (ns.body.items.length) await kc.deleteNamespace(nsName)
}

// Utils
export const getNsObject = (organization: string, projet: string, environment: string, owner: UserModel) => {
  return {
    metadata: {
      name: generateNamespaceName(organization, projet, environment),
      labels: {
        'dso/organization': organization,
        'dso/projet': projet,
        'dso/environment': environment,
        'dso/owner.id': owner.id,
        'app.kubernetes.io/managed-by': 'dso-console',
        // 'dso/owner.firstName': owner.firstName, // deactivate, need time to find a way to validate/transform specials chars
        // 'dso/owner.lastName': owner.lastName,
      },
    },
    kind: 'Namespace',
  }
}

export const generateNamespaceName = (org: Organization, proj: Project, env: Environment) => {
  const envHash = createHmac('sha256', '')
    .update(env)
    .digest('hex')
    .slice(0, 4)
  return `${org}-${proj}-${env}-${envHash}`
}
