import { Namespace } from 'kubernetes-models/v1'
import { CoreV1Api } from '@kubernetes/client-node'
import { createCoreV1Api } from './api.js'
import { type StepCall, type Environment, type EnvironmentCreateArgs, type EnvironmentDeleteArgs, type EnvironmentQuotaUpdateArgs, type Organization, type Project, type ResourceQuotaType, type UserObject, parseError } from '@cpn-console/hooks'
import { createResourceQuota, findResourceQuota, replaceResourceQuota } from './quota.js'
import { createHmac } from 'node:crypto'

type NamespaceProvided = Required<Namespace> & { metadata: Required<Namespace['metadata']> }

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
      error: parseError(error),
      status: {
        result: 'KO',
        message: 'Failed to create namespace or resourcequota',
      },
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
      error: parseError(error),
      status: {
        result: 'KO',
        message: 'Failed to update ResourceQuota',
      },
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
      error: parseError(error),
      status: {
        result: 'KO',
        message: 'Failed to delete namespace',
      },
    }
  }
}

// API
export const createNamespace = async (kc: CoreV1Api, nsObject: NamespaceProvided, quota: ResourceQuotaType) => {
  const nsName = nsObject.metadata.name
  const ns = await kc.listNamespace(undefined, undefined, undefined, `metadata.name=${nsName}`)
  if (!ns.body.items.length) {
    // @ts-ignore
    await kc.createNamespace(nsObject)
    await createResourceQuota(kc, nsName, quota)
  }
}

export const deleteNamespace = async (kc: CoreV1Api, nsName: string) => {
  const ns = await kc.listNamespace(undefined, undefined, undefined, `metadata.name=${nsName}`)
  if (ns.body.items.length) await kc.deleteNamespace(nsName)
}

// Utils
export const getNsObject = (organization: string, projet: string, environment: string, owner: UserObject): NamespaceProvided => {
  const nsObject = new Namespace({
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
  })
  return nsObject as NamespaceProvided
}

export const generateNamespaceName = (org: Organization, proj: Project, env: Environment) => {
  const envHash = createHmac('sha256', '')
    .update(env)
    .digest('hex')
    .slice(0, 4)
  return `${org}-${proj}-${env}-${envHash}`
}
