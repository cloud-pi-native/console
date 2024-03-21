import { ClusterObject, Environment, PluginApi, Project, ResourceQuotaType, UserObject } from '@cpn-console/hooks'
import { getNsObject } from './namespace.js'
import { CoreV1Api, V1Namespace, V1ObjectMeta } from '@kubernetes/client-node'
import { createCoreV1Api, createCustomObjectApi } from './api.js'
import { objectValues } from '@cpn-console/shared'
import { getQuotaObject } from './quota.js'
import { AnyObjectsApi } from './customApiClass.js'

type V1ObjectMetaPopulated = V1ObjectMeta & {
  name: string
}

export type V1NamespacePopulated = V1Namespace & {
  metadata: V1ObjectMetaPopulated
}

type BasicManifest = {
  kind: string
  metadata: {
    name: string
    [x: string]: any
  }
  [x: string]: any
}

type ResourceParams ={
  group?: string,
  version: string,
  plural: string,
  name: string,
  body: BasicManifest,
}

class KubernetesNamespace {
  nsObject: V1NamespacePopulated | undefined
  coreV1Api: CoreV1Api | undefined
  anyObjectApi: AnyObjectsApi | undefined

  constructor (organizationName: string, projectName: string, environmentName: string, owner: UserObject, cluster: ClusterObject) {
    this.coreV1Api = createCoreV1Api(cluster)
    if (this.coreV1Api) {
      this.anyObjectApi = createCustomObjectApi(cluster)
      this.nsObject = getNsObject(organizationName, projectName, environmentName, owner, cluster.zone.slug)
    }
  }

  public async create () {
    if (this.nsObject) {
      const ns = await this.coreV1Api?.createNamespace(this.nsObject) as { body: V1NamespacePopulated }
      this.nsObject = ns.body
    }
    return this.nsObject
  }

  public async delete () {
    if (this.nsObject) {
      return this.coreV1Api?.deleteNamespace(this.nsObject.metadata.name)
    }
  }

  public async getFromCluster () {
    try {
      if (this.nsObject) {
        const ns = await this.coreV1Api?.readNamespace(this.nsObject.metadata?.name) as { body: V1NamespacePopulated }
        this.nsObject = ns.body
      }
      return this.nsObject
    } catch (error) {
      return undefined
    }
  }

  public async getFromClusterOrCreate () {
    const ns = await this.getFromCluster()
    return ns ?? this.create()
  }

  public async createOrPatchRessource (r: ResourceParams) {
    if (this.nsObject) {
      const nsName = this.nsObject.metadata.name
      const objToCreate = structuredClone(r.body)
      objToCreate.metadata.namespace = nsName
      objToCreate.metadata.name = r.name

      // ajout des labels
      if (!objToCreate.metadata.labels) objToCreate.metadata.labels = { 'app.kubernetes.io/managed-by': 'dso-console' }
      else objToCreate.metadata.labels['app.kubernetes.io/managed-by'] = 'dso-console'

      try {
        await this.anyObjectApi?.getNamespacedCustomObject(r.group, r.version, nsName, r.plural, r.name)
        await this.anyObjectApi?.deleteNamespacedCustomObject(r.group, r.version, nsName, r.plural, r.name)
      } catch (error) {
      }
      return this.anyObjectApi?.createNamespacedCustomObject(r.group, r.version, nsName, r.plural, objToCreate)
    }
  }

  public async setQuota (quota: ResourceQuotaType) {
    if (this.nsObject) {
      const resourceQuotaName = 'dso-quota'
      const nsName = this.nsObject.metadata.name
      const quotaObject = getQuotaObject(nsName, quota)
      try {
        await this.coreV1Api?.readNamespacedResourceQuota(resourceQuotaName, this.nsObject.metadata.name)
        // @ts-ignore
        await this.coreV1Api?.replaceNamespacedResourceQuota(resourceQuotaName, nsName, quotaObject)
      } catch (error) {
        // @ts-ignore
        return this.coreV1Api?.createNamespacedResourceQuota(nsName, quotaObject)
      }
    }
  }
}

export class KubernetesProjectApi<GProject extends Project> extends PluginApi {
  public namespaces: Record<string, KubernetesNamespace> = {}
  constructor (project: GProject) {
    super()
    const ownerId = (project.roles.find(role => role.role === 'owner'))?.userId || project.users[0].id
    const owner = project.users.find(user => user.id === ownerId) as UserObject
    this.namespaces = project.environments.reduce((acc, env) => {
      const cluster = project.clusters.find(cluster => cluster.id === env.clusterId) as ClusterObject
      acc[env.name] = new KubernetesNamespace(project.organization.name, project.name, env.name, owner, cluster)
      return acc
    }, {} as Record<Environment['name'], KubernetesNamespace>)
  }

  public async getAllNamespaceFromClusterOrCreate () {
    return Promise.all(objectValues(this.namespaces).map(namespace => {
      return namespace.getFromClusterOrCreate()
    }))
  }

  public async applyResourcesInAllEnvNamespaces (resource: ResourceParams) {
    return Promise.all(objectValues(this.namespaces).map(namespace => {
      return namespace.createOrPatchRessource(resource)
    }))
  }
}
