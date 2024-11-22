import type { ClusterObject, Environment, Project, ResourceQuotaType, UserObject } from '@cpn-console/hooks'
import { PluginApi } from '@cpn-console/hooks'
import type { ApisApi, CoreV1Api, V1Namespace, V1ObjectMeta } from '@kubernetes/client-node'
import { objectValues, shallowMatch } from '@cpn-console/shared'
import { getNsObject } from './namespace.js'
import { createApisApi, createCoreV1Api, createCustomObjectApi } from './api.js'
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
  nsObject: V1NamespacePopulated
  coreV1Api: CoreV1Api | undefined
  anyObjectApi: AnyObjectsApi | undefined
  apisApi: ApisApi | undefined

  constructor(organizationName: string, projectName: string, environmentName: string, owner: UserObject, cluster: ClusterObject, projectId: string) {
    this.coreV1Api = createCoreV1Api(cluster)
    this.apisApi = createApisApi(cluster)
    this.anyObjectApi = createCustomObjectApi(cluster)
    this.nsObjectExpected = getNsObject(organizationName, projectName, environmentName, owner, cluster.zone.slug, projectId)
    this.nsObject = getNsObject(organizationName, projectName, environmentName, owner, cluster.zone.slug, projectId)
  }

  public async create() {
    if (!this.coreV1Api) return
    const ns = await this.coreV1Api.createNamespace(this.nsObject) as { body: V1NamespacePopulated }
    this.nsObject = ns.body
    return this.nsObject
  }

  public async ensure(currNs: V1NamespacePopulated): Promise<V1NamespacePopulated> {
    if (!this.coreV1Api) return currNs

    if (!shallowMatch(this.nsObjectExpected.metadata.labels, currNs.metadata.labels)) {
      const newNs = await this.coreV1Api.patchNamespace(this.nsObject.metadata.name, this.nsObjectExpected, undefined, undefined, undefined, undefined, undefined, patchOptions) as { body: V1NamespacePopulated }
      return newNs.body
    }
    return currNs
  }

  public async delete() {
    if (!this.coreV1Api) return
    return this.coreV1Api.deleteNamespace(this.nsObject.metadata.name)
  }

  public async getFromCluster() {
    try {
      if (!this.coreV1Api) return
      const ns = await this.coreV1Api.readNamespace(this.nsObject.metadata?.name) as { body: V1NamespacePopulated }
      this.nsObject = ns.body
      return this.nsObject
    } catch (_error) {
      return undefined
    }
  }

  public async getFromClusterOrCreate() {
    const ns = await this.getFromCluster()
    return ns ? this.ensure(ns) : this.create()
  }

  public async createOrPatchRessource(r: ResourceParams) {
    if (!this.anyObjectApi) return

    const nsName = this.nsObject.metadata.name
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
    } catch (_error) { }
    return this.anyObjectApi.createNamespacedCustomObject(r.group, r.version, nsName, r.plural, objToCreate)
  }

  public async setQuota(quota: ResourceQuotaType) {
    if (!this.coreV1Api) return

    const resourceQuotaName = 'dso-quota'
    const nsName = this.nsObject.metadata.name
    const quotaObject = getQuotaObject(nsName, quota)
    try {
      await this.coreV1Api.readNamespacedResourceQuota(resourceQuotaName, this.nsObject.metadata.name)
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
      acc[env.name] = new KubernetesNamespace(project.organization.name, project.name, env.name, owner, cluster, project.id)
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
