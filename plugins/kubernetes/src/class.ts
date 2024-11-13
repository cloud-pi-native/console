import type { ClusterObject, Environment, Project, ResourceQuotaType, UserObject } from '@cpn-console/hooks'
import { PluginApi } from '@cpn-console/hooks'
import type { CoreV1Api, V1Namespace, V1ObjectMeta } from '@kubernetes/client-node'
import { objectValues, shallowMatch } from '@cpn-console/shared'
import type { ProjectEnvSearch } from './namespace.js'
import { getNsObject, searchEnvNamespace } from './namespace.js'
import { createCoreV1Api, createCustomObjectApi } from './api.js'
import { getQuotaObject } from './quota.js'
import type { AnyObjectsApi } from './customApiClass.js'
import { patchOptions } from './misc.js'

type V1ObjectMetaPopulated = V1ObjectMeta & {
  name: string
}

export type V1NamespacePopulated = V1Namespace & {
  metadata: V1ObjectMetaPopulated
}

interface BasicManifest {
  kind: string
  metadata: {
    name: string
    [x: string]: any
  }
  [x: string]: any
}

interface ResourceParams {
  group?: string
  version: string
  plural: string
  name: string
  body: BasicManifest
}

class KubernetesNamespace {
  private readonly nsObjectExpected: V1NamespacePopulated
  nsObject: V1NamespacePopulated | undefined
  coreV1Api: CoreV1Api | undefined
  anyObjectApi: AnyObjectsApi | undefined
  private readonly envSearch: ProjectEnvSearch

  constructor(envSearch: ProjectEnvSearch, owner: UserObject, cluster: ClusterObject, projectId: string) {
    this.envSearch = envSearch
    this.coreV1Api = createCoreV1Api(cluster)
    this.anyObjectApi = createCustomObjectApi(cluster)

    this.nsObjectExpected = getNsObject({ environment: envSearch.envName, owner, zone: cluster.zone.slug, projectId, slug: envSearch.projectSlug })
  }

  public async create() {
    if (!this.coreV1Api) return
    const ns = await this.coreV1Api.createNamespace(this.nsObjectExpected) as { body: V1NamespacePopulated }
    this.nsObject = ns.body
    return this.nsObject
  }

  public async ensure(): Promise<V1NamespacePopulated | undefined> {
    if (!this.coreV1Api) return undefined
    if (!this.nsObject) {
      return this.create()
    }
    if (!shallowMatch(this.nsObjectExpected.metadata.labels, this.nsObject.metadata.labels)) {
      const newNs = await this.coreV1Api.patchNamespace(this.nsObject.metadata.name, this.nsObjectExpected, undefined, undefined, undefined, undefined, undefined, patchOptions) as { body: V1NamespacePopulated }
      this.nsObject = newNs.body
    }
    return this.nsObject
  }

  public async delete() {
    if (!this.coreV1Api) return
    const env = await this.getFromCluster()
    if (!env) {
      return undefined
    }
    return this.coreV1Api.deleteNamespace(env.metadata.name)
  }

  public async getFromCluster() {
    try {
      if (!this.coreV1Api) return
      const envFound = await searchEnvNamespace(this.envSearch, this.coreV1Api)
      if (!envFound) {
        return undefined
      }
      // const ns = await this.coreV1Api.readNamespace(this.nsObject.metadata?.name) as { body: V1NamespacePopulated }
      this.nsObject = envFound
      return this.nsObject
    } catch (_error) {
      return undefined
    }
  }

  public async getFromClusterOrCreate() {
    const ns = await this.getFromCluster()
    return ns ? this.ensure() : this.create()
  }

  public async createOrPatchRessource(r: ResourceParams) {
    if (!this.anyObjectApi) return
    // normalement le ns a dû être créer avant que cette fonction ne soit appelé
    const nsName = this.nsObject?.metadata.name as string
    const objToCreate = structuredClone(r.body)
    objToCreate.metadata.namespace = nsName
    objToCreate.metadata.name = r.name

    // ajout des labels
    if (objToCreate.metadata.labels) {
      objToCreate.metadata.labels['app.kubernetes.io/managed-by'] = 'dso-console'
    } else {
      objToCreate.metadata.labels = { 'app.kubernetes.io/managed-by': 'dso-console' }
    }
    try {
      await this.anyObjectApi.getNamespacedCustomObject(r.group, r.version, nsName, r.plural, r.name)
      await this.anyObjectApi.deleteNamespacedCustomObject(r.group, r.version, nsName, r.plural, r.name)
    } catch (error) {
      console.log(error)
    }
    return this.anyObjectApi.createNamespacedCustomObject(r.group, r.version, nsName, r.plural, objToCreate)
  }

  public async setQuota(quota: ResourceQuotaType) {
    if (!this.coreV1Api) return

    const resourceQuotaName = 'dso-quota'
    // normalement le ns a dû être créer avant que cette fonction ne soit appelé
    const nsName = this.nsObject?.metadata.name as string
    const quotaObject = getQuotaObject(nsName, quota)
    try {
      await this.coreV1Api.readNamespacedResourceQuota(resourceQuotaName, nsName)
      // @ts-ignore
      await this.coreV1Api.replaceNamespacedResourceQuota(resourceQuotaName, nsName, quotaObject)
    } catch (_error) {
      // @ts-ignore
      return this.coreV1Api.createNamespacedResourceQuota(nsName, quotaObject)
    }
  }
}

export class KubernetesProjectApi<GProject extends Project> extends PluginApi {
  public namespaces: Record<string, KubernetesNamespace> = {}
  constructor(project: GProject) {
    super()
    const owner = project.owner
    this.namespaces = project.environments.reduce((acc, env) => {
      const cluster = project.clusters.find(cluster => cluster.id === env.clusterId) as ClusterObject
      acc[env.name] = new KubernetesNamespace({
        envName: env.name,
        organizationName: project.organization.name,
        projectName: project.name,
        projectSlug: project.slug,
      }, owner, cluster, project.id)
      return acc
    }, {} as Record<Environment['name'], KubernetesNamespace>)
  }

  public async getAllNamespaceFromClusterOrCreate() {
    return Promise.all(objectValues(this.namespaces).map((namespace) => {
      return namespace.getFromClusterOrCreate()
    }))
  }

  public async applyResourcesInAllEnvNamespaces(resource: ResourceParams) {
    return Promise.all(objectValues(this.namespaces).map((namespace) => {
      return namespace.createOrPatchRessource(resource)
    }))
  }
}
