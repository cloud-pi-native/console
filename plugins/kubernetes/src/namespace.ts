import { Namespace } from 'kubernetes-models/v1'
import type { BareMinimumResource, ListMinimumResources, PluginResult, Project, StepCall, UserObject } from '@cpn-console/hooks'
import { parseError, uniqueResource } from '@cpn-console/hooks'
import type { CoreV1Api } from '@kubernetes/client-node'
import { createCoreV1Api } from './api.js'
import type { V1NamespacePopulated } from './class.js'

export type NamespaceProvided = Required<Namespace> & { metadata: Required<Namespace['metadata']> }

export const createNamespaces: StepCall<Project> = async (payload) => {
  let statusResult: PluginResult['status']['result'] = 'OK'
  const warnMessages: string[] = []
  try {
    const project = payload.args
    const kubeApi = payload.apis.kubernetes

    await kubeApi.getAllNamespaceFromClusterOrCreate()

    await Promise.all(project.environments.map(env => kubeApi.namespaces[env.name].setQuota(env.quota)))

    for (const cluster of project.clusters) {
      const kubeClient = createCoreV1Api(cluster)
      if (!kubeClient)
        continue
      const projectNamespaces = await discoverAllProjectNamespacesInCluster(project, kubeClient)
      for (const namespace of projectNamespaces) {
        const environmentName = namespace.metadata?.labels?.['dso/environment'] as string | undefined
        const nsName = namespace.metadata?.name as string
        if (!environmentName) {
          statusResult = 'WARNING'
          const warnMessage = `Metadata dso/environment manquante sur le namespace ${nsName} (${cluster.label}), ignoring, please inspect`
          console.log(warnMessage)
          warnMessages.push(warnMessage)
        }
        const envsForCluster = project.environments.filter(env => env.clusterId === cluster.id)

        if (!envsForCluster.find(env => env.name === environmentName)) {
          console.log(`Le namespace ${nsName} n'a plus rien à faire là, suppression`)
          // await kubeClient?.deleteNamespace(nsName)
        }
      }
    }
    return {
      status: {
        result: statusResult,
        message: warnMessages.length ? warnMessages.join('; ') : 'Namespaces and quotas up-to-date',
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
      if (!kubeClient)
        continue
      const projectNamespaces = await discoverAllProjectNamespacesInCluster(project, kubeClient)
      for (const namespace of projectNamespaces) {
        console.log(`Le namespace ${namespace.metadata?.name} n'a plus rien à faire là, suppression`)
        // const nsName = namespace.metadata?.name as string
        // await kubeClient.deleteNamespace(nsName)
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
export function getNsObject({ environment, owner, zone, projectId, slug }: { environment: string, owner: UserObject, zone: string, projectId: string, slug: string }): V1NamespacePopulated {
  const nsObject = new Namespace({
    metadata: {
      name: generateNamespaceName(slug, environment),
      labels: {
        'dso/project.slug': slug,
        'dso/environment': environment,
        'dso/owner.id': owner.id,
        'app.kubernetes.io/managed-by': 'dso-console',
        'dso/zone': zone,
        'dso/project.id': projectId,
      },
    },
  })
  return nsObject as V1NamespacePopulated
}

export function generateNamespaceName(slug: string, env: string) {
  return `${slug}--${env}`
}

const getNamespaceSelectorsOld = (project: Project) => `dso/organization=${project.organization.name},dso/projet=${project.name},app.kubernetes.io/managed-by=dso-console`
const getNamespaceSelectors = (project: Project) => `dso/project.slug=${project.slug},app.kubernetes.io/managed-by=dso-console`

export async function discoverAllProjectNamespacesInCluster(project: Project, kubeClient: CoreV1Api): Promise<BareMinimumResource[]> {
  const [projectNamespacesOld, projectNamespaces] = await Promise.all([
    kubeClient.listNamespace(undefined, undefined, undefined, undefined, getNamespaceSelectorsOld(project)),
    kubeClient.listNamespace(undefined, undefined, undefined, undefined, getNamespaceSelectors(project)),
  ]) as [ListMinimumResources, ListMinimumResources]

  return uniqueResource(projectNamespacesOld.body.items, projectNamespaces.body.items)
}

export interface ProjectEnvSearch {
  projectSlug: string
  projectName: string
  organizationName: string
  envName: string
}
const getEnvNamespaceSelectorsOld = ({ envName, organizationName, projectName }: ProjectEnvSearch) => `dso/organization=${organizationName},dso/projet=${projectName},dso/environment=${envName},app.kubernetes.io/managed-by=dso-console`
const getEnvNamespaceSelectors = ({ envName, projectSlug }: ProjectEnvSearch) => `dso/project.slug=${projectSlug},dso/environment=${envName},app.kubernetes.io/managed-by=dso-console`

export async function searchEnvNamespace(project: ProjectEnvSearch, kubeClient: CoreV1Api): Promise<BareMinimumResource | undefined> {
  const [projectNamespacesOld, projectNamespaces] = await Promise.all([
    kubeClient.listNamespace(undefined, undefined, undefined, undefined, getEnvNamespaceSelectorsOld(project)),
    kubeClient.listNamespace(undefined, undefined, undefined, undefined, getEnvNamespaceSelectors(project)),
  ]) as [ListMinimumResources, ListMinimumResources]

  return uniqueResource(projectNamespacesOld.body.items, projectNamespaces.body.items)[0]
}
