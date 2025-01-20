import type { ClusterObject, Environment, Project, ProjectLite, ResourceQuotaType, UserObject } from '@cpn-console/hooks'
import { PluginApi } from '@cpn-console/hooks'
import type { ApisApi, CoreV1Api, V1Namespace, V1ObjectMeta } from '@kubernetes/client-node'
import { shallowMatch } from '@cpn-console/shared'
import { getNsObject, searchEnvNamespaces } from './namespace.js'
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

export class KubernetesNamespace extends PluginApi {
  private readonly nsObjectExpected: V1NamespacePopulated
  private readonly environment: Environment
  nsName?: string
  coreV1Api: CoreV1Api | undefined
  anyObjectApi: AnyObjectsApi | undefined
  apisApi: ApisApi | undefined
  project: ProjectLite

  constructor(project: ProjectLite, environment: Environment, owner: UserObject, cluster: ClusterObject) {
    super()
    this.project = project
    this.environment = environment
    this.coreV1Api = createCoreV1Api(cluster)
    this.apisApi = createApisApi(cluster)
    this.anyObjectApi = createCustomObjectApi(cluster)
    this.nsObjectExpected = getNsObject({
      environment,
      owner,
      project,
      zone: cluster.zone.slug,
    })
  }

  public async getNsName(): Promise<string> {
    if (this.nsName) {
      return this.nsName
    }
    if (!this.coreV1Api) return this.nsObjectExpected.metadata.name
    const currNs = await this.getFromCluster()

    if (currNs?.metadata?.name) {
      return currNs.metadata.name
    }
    throw new Error('Can\'t determine namespace name cause it doesn\'t exist yet or have already been deleted')
  }

  public async create(): Promise<V1NamespacePopulated | undefined> {
    if (!this.coreV1Api) return
    const ns = await this.coreV1Api.createNamespace(this.nsObjectExpected) as { body: V1NamespacePopulated }
    this.nsName = this.nsObjectExpected.metadata.name
    return ns.body
  }

  public async ensure(currNs: V1Namespace): Promise<V1Namespace> {
    if (!this.coreV1Api) return currNs

    if (!shallowMatch(this.nsObjectExpected.metadata.labels, currNs.metadata?.labels) && currNs.metadata?.name) {
      const newNs = await this.coreV1Api.patchNamespace(currNs.metadata.name, this.nsObjectExpected, undefined, undefined, undefined, undefined, undefined, patchOptions)
      return newNs.body
    }
    return currNs
  }

  public async delete() {
    if (!this.coreV1Api) return
    const nsName = await this.getNsName()
    return this.coreV1Api.deleteNamespace(nsName)
  }

  public async getFromCluster(): Promise<V1Namespace | undefined> {
    if (!this.coreV1Api) return
    let ns: V1Namespace | undefined
    try {
      const resByName = await this.coreV1Api.readNamespace(this.nsObjectExpected.metadata.name)
      ns = resByName.body
    } catch (_error) {
      const namespacesFound = await searchEnvNamespaces({
        projectName: this.project.name,
        organizationName: this.project.organization.name,
        projectSlug: this.project.slug,
        envName: this.environment.name,
      }, this.coreV1Api)
      ns = namespacesFound
        .find(candidateNs => candidateNs.metadata?.labels?.['dso/environment'] === this.environment.name || candidateNs.metadata?.labels?.['dso/environment.id'] === this.environment.id)
    }
    if (!this.nsName && ns?.metadata?.name) {
      this.nsName = ns.metadata.name
      this.nsObjectExpected.metadata.name = this.nsName
    }
    return ns
  }

  public async getFromClusterOrCreate() {
    if (!this.coreV1Api) return
    const ns = await this.getFromCluster()
    return ns ? this.ensure(ns) : this.create()
  }

  public async createOrPatchRessource(r: ResourceParams) {
    if (!this.anyObjectApi) return

    const nsName = await this.getNsName()
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
    const nsName = await this.getNsName()
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
  private readonly project: Project
  constructor(project: GProject) {
    super()
    this.project = project
    const owner = project.owner
    for (const env of project.environments) {
      const cluster = project.clusters.find(cluster => cluster.id === env.clusterId) as ClusterObject
      const envClass = new KubernetesNamespace(project, env, owner, cluster)
      env.apis.kubernetes = envClass
    }
  }

  public getAllNamespaceFromClusterOrCreate() {
    return this.project.environments.map((env) => {
      return env.apis.kubernetes?.getFromClusterOrCreate()
    })
  }

  public applyResourcesInAllEnvNamespaces(resource: ResourceParams) {
    return this.project.environments.map((env) => {
      return env.apis.kubernetes?.createOrPatchRessource(resource)
    })
  }
}
