import { Namespace } from 'kubernetes-models/v1'
import type { BareMinimumResource, Environment, ListMinimumResources, PluginResult, Project, ProjectLite, StepCall, UserObject } from '@cpn-console/hooks'
import { parseError, uniqueResource } from '@cpn-console/hooks'
import { generateNamespaceName } from '@cpn-console/shared'
import type { CoreV1Api } from '@kubernetes/client-node'
import { createCoreV1Api } from './api.js'
import type { V1NamespacePopulated } from './class.js'

export type NamespaceProvided = Required<Namespace> & { metadata: Required<Namespace['metadata']> }

export const createNamespaces: StepCall<Project> = async (payload) => {
  const statusResult: PluginResult['status']['result'] = 'OK'
  const warnMessages: string[] = []
  try {
    const project = payload.args

    await Promise.all(project.environments.map(async (env) => {
      if (env.apis.kubernetes) {
        await env.apis.kubernetes.getFromClusterOrCreate()
        return env.apis.kubernetes.setQuota(env.quota)
      }
    }))

    for (const cluster of project.clusters) {
      const kubeClient = createCoreV1Api(cluster)
      if (!kubeClient) {
        continue
      }
      const envsForCluster = project.environments.filter(env => env.clusterId === cluster.id)
      const projectNamespaces = await discoverAllProjectNamespacesInCluster(project, kubeClient)

      for (const namespace of projectNamespaces) {
        const environmentName = namespace.metadata?.labels?.['dso/environment'] as string | undefined

        if (!envsForCluster.find(env => env.name === environmentName)) {
          const nsName = namespace.metadata.name
          console.log(`Le namespace ${nsName} n'a plus rien à faire là, suppression`)
          await kubeClient.deleteNamespace(nsName)
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
      if (!kubeClient) {
        continue
      }
      const projectNamespaces = await discoverAllProjectNamespacesInCluster(project, kubeClient)
      for (const namespace of projectNamespaces) {
        const nsName = namespace.metadata.name
        console.log(`Le namespace ${nsName} n'a plus rien à faire là, suppression`)
        await kubeClient.deleteNamespace(nsName)
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
export function getNsObject({ environment, owner, zone, project }: { environment: Environment, owner: UserObject, zone: string, project: ProjectLite }): V1NamespacePopulated {
  const nsObject = new Namespace({
    metadata: {
      name: generateNamespaceName(project.id, environment.id),
      labels: {
        'app.kubernetes.io/managed-by': 'dso-console',
        'dso/owner.id': owner.id,
        'dso/environment.id': environment.id,
        'dso/environment': environment.name,
        'dso/project.id': project.id,
        'dso/project.slug': project.slug,
        'dso/zone': zone,
      },
    },
  })
  return nsObject as V1NamespacePopulated
}

const getNamespaceSelectorsOld = (project: Project) => `dso/organization=${project.organization.name},dso/projet=${project.name},app.kubernetes.io/managed-by=dso-console`
const getNamespaceSelectorsOld2 = (project: Project) => `dso/organization=${project.organization.name},dso/project=${project.name},app.kubernetes.io/managed-by=dso-console`
const getNamespaceSelectors = (project: Project) => `dso/project.id=${project.id},app.kubernetes.io/managed-by=dso-console`

export async function discoverAllProjectNamespacesInCluster(project: Project, kubeClient: CoreV1Api): Promise<BareMinimumResource[]> {
  const [projectNamespacesOld, projectNamespacesOld2, projectNamespaces] = await Promise.all([
    kubeClient.listNamespace(undefined, undefined, undefined, undefined, getNamespaceSelectorsOld(project)),
    kubeClient.listNamespace(undefined, undefined, undefined, undefined, getNamespaceSelectorsOld2(project)),
    kubeClient.listNamespace(undefined, undefined, undefined, undefined, getNamespaceSelectors(project)),
  ]) as [ListMinimumResources, ListMinimumResources, ListMinimumResources]

  return uniqueResource(projectNamespacesOld.body.items, projectNamespacesOld2.body.items, projectNamespaces.body.items)
}

export interface ProjectEnvSearch {
  projectSlug: string
  projectName: string
  organizationName: string
  envName: string
}
const getEnvNamespaceSelectorsOld = ({ envName, organizationName, projectName }: ProjectEnvSearch) => `dso/organization=${organizationName},dso/projet=${projectName},dso/environment=${envName},app.kubernetes.io/managed-by=dso-console`
const getEnvNamespaceSelectorsOld2 = ({ envName, organizationName, projectName }: ProjectEnvSearch) => `dso/organization=${organizationName},dso/project=${projectName},dso/environment=${envName},app.kubernetes.io/managed-by=dso-console`
const getEnvNamespaceSelectors = ({ envName, projectSlug }: ProjectEnvSearch) => `dso/project.slug=${projectSlug},dso/environment=${envName},app.kubernetes.io/managed-by=dso-console`

export async function searchEnvNamespaces(project: ProjectEnvSearch, kubeClient: CoreV1Api): Promise<BareMinimumResource[]> {
  const [projectNamespacesOld, projectNamespacesOld2, projectNamespaces] = await Promise.all([
    kubeClient.listNamespace(undefined, undefined, undefined, undefined, getEnvNamespaceSelectorsOld(project)),
    kubeClient.listNamespace(undefined, undefined, undefined, undefined, getEnvNamespaceSelectorsOld2(project)),
    kubeClient.listNamespace(undefined, undefined, undefined, undefined, getEnvNamespaceSelectors(project)),
  ]) as [ListMinimumResources, ListMinimumResources, ListMinimumResources]

  return uniqueResource(projectNamespacesOld.body.items, projectNamespacesOld2.body.items, projectNamespaces.body.items)
}
