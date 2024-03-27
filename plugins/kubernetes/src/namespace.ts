import { Namespace } from 'kubernetes-models/v1'
import { createCoreV1Api } from './api.js'
import { type StepCall, type Project, type UserObject, parseError } from '@cpn-console/hooks'
import { createHmac } from 'node:crypto'
import { V1NamespacePopulated } from './class.js'

export type NamespaceProvided = Required<Namespace> & { metadata: Required<Namespace['metadata']> }

const getNamespaceSelectors = (project: Project) => `dso/organization=${project.organization.name},dso/projet=${project.name},app.kubernetes.io/managed-by=dso-console`

export const createNamespaces: StepCall<Project> = async (payload) => {
  try {
    const project = payload.args
    const kubeApi = payload.apis.kubernetes

    await kubeApi.getAllNamespaceFromClusterOrCreate()

    await Promise.all(project.environments.map(env => kubeApi.namespaces[env.name].setQuota(env.quota)))

    for (const cluster of project.clusters) {
      const kubeClient = createCoreV1Api(cluster)
      const projectNamespaces = await kubeClient.listNamespace(undefined, undefined, undefined, undefined, getNamespaceSelectors(project))
      for (const namespace of projectNamespaces.body.items) {
        const { 'dso/environment': environmentName } = namespace.metadata?.labels as { 'dso/organization': string, 'dso/projet': string, environment: string, 'dso/environment': string }
        const nsName = namespace.metadata?.name as string

        const envsForCluster = project.environments.filter(env => env.clusterId === cluster.id)

        if (!envsForCluster.find(env => env.name === environmentName)) {
          console.log(`Le namespace ${namespace.metadata?.name} n'a plus rien à faire là, suppression`)
          kubeClient.deleteNamespace(nsName)
        }
      }
    }
    return {
      status: {
        result: 'OK',
        message: 'Namespaces and quotas up-to-date',
      },
    }
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        message: 'Failed to create/update namespace or resourcequota',
      },
    }
  }
}

export const deleteNamespaces: StepCall<Project> = async (payload) => {
  try {
    const project = payload.args

    for (const cluster of project.clusters) {
      const kubeClient = createCoreV1Api(cluster)
      const projectNamespaces = await kubeClient.listNamespace(undefined, undefined, undefined, undefined, getNamespaceSelectors(project))
      for (const namespace of projectNamespaces.body.items) {
        console.log(`Le namespace ${namespace.metadata?.name} n'a plus rien à faire là, suppression`)
        console.log(namespace.metadata?.labels)
        const nsName = namespace.metadata?.name as string
        kubeClient.deleteNamespace(nsName)
      }
    }
    return {
      status: {
        result: 'OK',
        message: 'Namespaces deleted',
      },
    }
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        message: 'Failed to delete namespaces',
      },
    }
  }
}

// Utils
export const getNsObject = (organization: string, project: string, environment: string, owner: UserObject): V1NamespacePopulated => {
  const nsObject = new Namespace({
    metadata: {
      name: generateNamespaceName(organization, project, environment),
      labels: {
        'dso/organization': organization,
        'dso/projet': project,
        'dso/project': project,
        'dso/environment': environment,
        'dso/owner.id': owner.id,
        'app.kubernetes.io/managed-by': 'dso-console',
        // 'dso/owner.firstName': owner.firstName, // deactivate, need time to find a way to validate/transform specials chars
        // 'dso/owner.lastName': owner.lastName,
      },
    },
  })
  return nsObject as V1NamespacePopulated
}

export const generateNamespaceName = (org: string, proj: string, env: string) => {
  const envHash = createHmac('sha256', '')
    .update(env)
    .digest('hex')
    .slice(0, 4)
  return `${org}-${proj}-${env}-${envHash}`
}
