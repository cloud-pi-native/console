import type { AxiosInstance } from 'axios'
import axios from 'axios'
import type { ProjectLite } from '@cpn-console/hooks'
import { PluginApi } from '@cpn-console/hooks'
import getConfig from './config.js'
import {
  generateKVConfigUpdate,
  getAuthMethod,
} from './utils.js'

interface ReadOptions {
  throwIfNoEntry: boolean
}
export interface AppRoleCredentials {
  url: string
  coreKvName: string
  roleId: string
  secretId: string
}

abstract class VaultApi extends PluginApi {
  protected readonly axios: AxiosInstance
  private token: string | undefined = undefined

  constructor() {
    super()
    this.axios = axios.create({
      baseURL: getConfig().internalUrl,
      headers: {
        'X-Vault-Token': getConfig().token,
      },
    })
  }

  protected async getToken() {
    if (!this.token) {
      this.token = (await this.axios.post('/v1/auth/token/create')).data.auth
        .client_token as string
    }
    return this.token
  }

  protected async destroy(path: string, kvName: string) {
    if (path.startsWith('/')) path = path.slice(1)
    return await this.axios({
      method: 'delete',
      url: `/v1/${kvName}/metadata/${path}`,
      headers: { 'X-Vault-Token': await this.getToken() },
    })
  }

  Kv = {
    upsert: async (kvName: string) => {
      const token = await this.getToken()
      const kvRes = await this.axios({
        method: 'get',
        url: `/v1/sys/mounts/${kvName}/tune`,
        headers: { 'X-Vault-Token': token },
        validateStatus: code => [400, 200].includes(code),
      })
      if (kvRes.status === 400) {
        await this.axios({
          method: 'post',
          url: `/v1/sys/mounts/${kvName}`,
          headers: {
            'X-Vault-Token': token,
          },
          data: {
            type: 'kv',
            config: {
              force_no_cache: true,
            },
            options: {
              version: 2,
            },
          },
        })
      } else {
        // means 200 status
        const configUpdate = generateKVConfigUpdate(kvRes.data)
        if (configUpdate) {
          await this.axios({
            method: 'put',
            url: `/v1/sys/mounts/${kvName}/tune`,
            headers: {
              'X-Vault-Token': token,
            },
            data: configUpdate,
          })
        }
      }
    },
    delete: async (kvName: string) => {
      const token = await this.getToken()
      return await this.axios({
        method: 'delete',
        url: `/v1/sys/mounts/${kvName}`,
        headers: { 'X-Vault-Token': token },
        validateStatus: code => [400, 200, 204].includes(code),
      })
    },
  }

  Policy = {
    upsert: async (policyName: string, policy: string) => {
      await this.axios({
        method: 'put',
        url: `/v1/sys/policies/acl/${policyName}`,
        data: { policy },
        headers: {
          'X-Vault-Token': await this.getToken(),
          'Content-Type': 'application/json',
        },
      })
    },
    delete: async (policyName: string) => {
      await this.axios({
        method: 'delete',
        url: `/v1/sys/policies/acl/${policyName}`,
        headers: {
          'X-Vault-Token': await this.getToken(),
          'Content-Type': 'application/json',
        },
      })
    },
  }

  Role = {
    upsert: async (roleName: string, policies: string[]) => {
      await this.axios({
        method: 'post',
        url: `/v1/auth/approle/role/${roleName}`,
        data: {
          secret_id_num_uses: '0',
          secret_id_ttl: '0',
          token_max_ttl: '0',
          token_num_uses: '0',
          token_ttl: '0',
          token_type: 'batch',
          token_policies: policies,
        },
        headers: { 'X-Vault-Token': await this.getToken() },
      })
    },
    delete: async (roleName: string) => {
      await this.axios.delete(`/v1/auth/approle/role/${roleName}`, {
        headers: { 'X-Vault-Token': await this.getToken() },
      })
    },
    getCredentials: async (roleName: string) => {
      const { data: dataRole } = await this.axios.get(
        `/v1/auth/approle/role/${roleName}/role-id`,
        {
          headers: { 'X-Vault-Token': await this.getToken() },
        },
      )
      const { data: dataSecret } = await this.axios.put(
        `/v1/auth/approle/role/${roleName}/secret-id`,
        'null', // Force empty data
        {
          headers: { 'X-Vault-Token': await this.getToken() },
        },
      )
      return {
        roleId: dataRole.data?.role_id,
        secretId: dataSecret.data?.secret_id,
      }
    },
  }
}

export class VaultProjectApi extends VaultApi {
  private readonly basePath: string
  private readonly roleName: string
  private readonly projectRootDir: string
  private readonly defaultAppRoleCredentials: AppRoleCredentials
  private readonly coreKvName: string = 'forge-dso'
  private readonly projectKvName: string
  private readonly groupName: string
  private readonly policyName: {
    techRO: string
    appFull: string
  }

  constructor(project: ProjectLite) {
    super()
    this.basePath = project.slug
    this.roleName = project.slug
    this.projectRootDir = getConfig().projectsRootDir
    this.projectKvName = project.slug
    this.groupName = project.slug
    this.policyName = {
      techRO: `tech--${project.slug}--ro`,
      appFull: `app--${project.slug}--admin`,
    }
    this.defaultAppRoleCredentials = {
      url: getConfig().deployVaultConnectionInNs ? getConfig().publicUrl : '',
      coreKvName: this.coreKvName,
      roleId: 'none',
      secretId: 'none',
    }
  }

  public async list(path: string = '/'): Promise<string[]> {
    if (!path.startsWith('/')) path = `/${path}`

    const listSecretPath: string[] = []
    const response = await this.axios({
      url: `/v1/${this.coreKvName}/metadata/${this.projectRootDir}/${this.basePath}${path}/`,
      headers: {
        'X-Vault-Token': await this.getToken(),
      },
      method: 'list',
      validateStatus: code => [200, 404].includes(code),
    })

    if (response.status === 404) return listSecretPath
    for (const key of response.data.data.keys) {
      if (key.endsWith('/')) {
        const subSecrets = await this.list(
          `${path.substring(this.basePath.length)}/${key}`,
        )
        subSecrets.forEach((secret) => {
          listSecretPath.push(`${key}${secret}`)
        })
      } else {
        listSecretPath.push(`/${key}`)
      }
    }
    return listSecretPath.flat()
  }

  public async read(
    path: string = '/',
    options: ReadOptions = { throwIfNoEntry: true },
  ) {
    if (path.startsWith('/')) path = path.slice(1)
    const response = await this.axios.get(
      `/v1/${this.coreKvName}/data/${this.projectRootDir}/${this.basePath}/${path}`,
      {
        headers: { 'X-Vault-Token': await this.getToken() },
        validateStatus: status =>
          (options.throwIfNoEntry ? [200] : [200, 404]).includes(status),
      },
    )
    return response.data.data
  }

  public async write(body: object, path: string = '/') {
    if (path.startsWith('/')) path = path.slice(1)
    const response = await this.axios.post(
      `/v1/${this.coreKvName}/data/${this.projectRootDir}/${this.basePath}/${path}`,
      {
        headers: { 'X-Vault-Token': await this.getToken() },
        data: body,
      },
    )
    return await response.data
  }

  public async destroy(path: string = '/') {
    if (path.startsWith('/')) path = path.slice(1)
    return super.destroy(
      `${this.projectRootDir}/${this.basePath}/${path}`,
      this.coreKvName,
    )
  }

  Project = {
    upsert: async () => {
      await this.Kv.upsert(this.projectKvName)
      await this.Policy.upsert(
        this.policyName.appFull,
        `path "${this.projectKvName}/*" { capabilities = ["create", "read", "update", "delete", "list"] }`,
      )
      await this.Policy.upsert(
        this.policyName.techRO,
        `path "${this.coreKvName}/data/${this.projectRootDir}/${this.basePath}/REGISTRY/ro-robot" { capabilities = ["read"] }`,
      )
      await this.Group.upsert()
      await this.Role.upsert(this.roleName, [
        this.policyName.techRO,
        this.policyName.appFull,
      ])
    },
    delete: async () => {
      await this.Kv.delete(this.projectKvName)
      await this.Policy.delete(this.policyName.appFull)
      await this.Policy.delete(this.policyName.techRO)
      await this.Group.delete()
      await this.Role.delete(this.roleName)
    },
    getCredentials: async () => {
      const creds = await this.Role.getCredentials(this.roleName)
      return {
        ...this.defaultAppRoleCredentials,
        ...creds,
      }
    },
  }

  Group = {
    upsert: async () => {
      // TODO check api responses for POST and GET maybe duplicates
      await this.axios({
        method: 'post',
        url: `/v1/identity/group/name/${this.groupName}`,
        headers: { 'X-Vault-Token': await this.getToken() },
        data: {
          name: this.groupName,
          type: 'external',
          policies: [this.policyName.appFull],
        },
      })

      const response = await this.axios({
        method: 'get',
        url: `/v1/identity/group/name/${this.groupName}`,
        headers: { 'X-Vault-Token': await this.getToken() },
        validateStatus: code => [404, 200].includes(code),
      })
      const group = response.data
      const groupAliasName = `/${this.groupName}`
      if (group.data.alias?.name === groupAliasName) {
        return
      }
      const methods = await getAuthMethod(this.axios, await this.getToken())

      await this.axios({
        url: `/v1/identity/group-alias`,
        method: 'post',
        headers: { 'X-Vault-Token': await this.getToken() },
        data: {
          name: groupAliasName,
          mount_accessor: methods['oidc/'].accessor,
          canonical_id: group.data.id,
        },
      })
    },
    delete: async () => {
      await this.axios({
        method: 'delete',
        url: `/v1/identity/group/name/${this.groupName}`,
        headers: { 'X-Vault-Token': await this.getToken() },
      })
    },
  }
}

interface VaultValuesWithoutCredentials {
  /** Slash-separated directory (root node of all Gitlab projects) */
  projectsRootDir: string
}
interface VaultCredentials {
  url: string
  kvName: string
  roleId: string
  secretId: string
}
type VaultValues = VaultCredentials & VaultValuesWithoutCredentials

export class VaultZoneApi extends VaultApi {
  private readonly kvName: string
  private readonly policyName: string
  private readonly roleName: string
  constructor(name: string) {
    super()
    this.kvName = `zone-${name}`
    this.policyName = `tech--${this.kvName}--ro`
    this.roleName = `zone-${name}`
  }

  public async upsert() {
    await this.Kv.upsert(this.kvName)
    await this.Policy.upsert(
      this.policyName,
      `path "${this.kvName}/*" { capabilities = ["read"] }`,
    )
    await this.Role.upsert(this.roleName, [this.policyName])
  }

  public async delete() {
    await this.Kv.delete(this.kvName)
    await this.Policy.delete(this.policyName)
    await this.Role.delete(this.roleName)
  }

  public async write(body: object, path: string = '/') {
    if (path.startsWith('/')) path = path.slice(1)
    const response = await this.axios.post(`/v1/${this.kvName}/data/${path}`, {
      headers: { 'X-Vault-Token': await this.getToken() },
      data: body,
    })
    return await response.data
  }

  public async destroy(path: string = '/') {
    if (path.startsWith('/')) path = path.slice(1)
    return super.destroy(path, this.kvName)
  }

  public async getCredentials(): Promise<VaultCredentials> {
    return {
      url: getConfig().publicUrl,
      kvName: this.kvName,
      ...(await this.Role.getCredentials(this.roleName)),
    } as VaultCredentials
  }

  public async getValues(): Promise<VaultValues> {
    return {
      projectsRootDir: getConfig().projectsRootDir,
      ...(await this.getCredentials()),
    }
  }
}
