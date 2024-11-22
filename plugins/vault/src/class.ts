import type { AxiosInstance } from 'axios'
import axios from 'axios'
import type { ProjectLite } from '@cpn-console/hooks'
import { PluginApi } from '@cpn-console/hooks'
import getConfig from './config.js'
import { generateKVConfigUpdate, getAuthMethod, isAppRoleEnabled } from './utils.js'

interface ReadOptions {
  throwIfNoEntry: boolean
}
export interface AppRoleCredentials {
  url: string
  coreKvName: string
  roleId: string
  secretId: string
}

export class VaultProjectApi extends PluginApi {
  private token: string | undefined = undefined
  private readonly axios: AxiosInstance
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
    this.basePath = `${project.organization.name}/${project.name}`
    this.roleName = `${project.organization.name}-${project.name}`
    this.projectRootDir = getConfig().projectsRootDir
    this.projectKvName = `${project.organization.name}-${project.name}`
    this.groupName = `${project.organization.name}-${project.name}`
    this.policyName = {
      techRO: `tech--${project.organization.name}-${project.name}--ro`,
      appFull: `app--${project.organization.name}-${project.name}--admin`,
    }
    this.axios = axios.create({
      baseURL: getConfig().internalUrl,
      headers: {
        'X-Vault-Token': getConfig().token,
      },
    })
    this.defaultAppRoleCredentials = {
      url: getConfig().publicUrl,
      coreKvName: this.coreKvName,
      roleId: 'none',
      secretId: 'none',
    }
  }

  private async getToken() {
    if (!this.token) {
      this.token = (await this.axios.post('/v1/auth/token/create'))
        .data.auth.client_token as string
    }
    return this.token
  }

  public async list(path: string = '/'): Promise<string[]> {
    if (!path.startsWith('/'))
      path = `/${path}`

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
        const subSecrets = await this.list(`${path.substring(this.basePath.length)}/${key}`)
        subSecrets.forEach((secret) => {
          listSecretPath.push(`${key}${secret}`)
        })
      } else {
        listSecretPath.push(`/${key}`)
      }
    }
    return listSecretPath.flat()
  }

  public async read(path: string = '/', options: ReadOptions = { throwIfNoEntry: true }) {
    if (path.startsWith('/'))
      path = path.slice(1)
    const response = await this.axios.get(
      `/v1/${this.coreKvName}/data/${this.projectRootDir}/${this.basePath}/${path}`,
      {
        headers: { 'X-Vault-Token': await this.getToken() },
        validateStatus: status => (options.throwIfNoEntry ? [200] : [200, 404]).includes(status),
      },
    )
    return response.data.data
  }

  public async write(body: object, path: string = '/') {
    if (path.startsWith('/'))
      path = path.slice(1)
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
    if (path.startsWith('/'))
      path = path.slice(1)
    return this.axios({
      method: 'delete',
      url: `/v1/${this.coreKvName}/metadata/${this.projectRootDir}/${this.basePath}/${path}`,
      headers: { 'X-Vault-Token': await this.getToken() },

    })
  }

  Project = {
    upsert: async () => {
      const token = await this.getToken()
      const kvRes = await this.axios({
        method: 'get',
        url: `/v1/sys/mounts/${this.projectKvName}/tune`,
        headers: { 'X-Vault-Token': token },
        validateStatus: code => [400, 200].includes(code),
      })
      if (kvRes.status === 400) {
        await this.axios({
          method: 'post',
          url: `/v1/sys/mounts/${this.projectKvName}`,
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
      } else { // means 200 status
        const configUpdate = generateKVConfigUpdate(kvRes.data)
        if (configUpdate) {
          await this.axios({
            method: 'put',
            url: `/v1/sys/mounts/${this.projectKvName}/tune`,
            headers: {
              'X-Vault-Token': token,
            },
            data: configUpdate,
          })
        }
      }

      await this.Policy.ensureAll()
      await this.Group.upsert()
      await this.Role.upsert()
    },
    delete: async () => {
      const token = await this.getToken()
      await this.axios({
        method: 'delete',
        url: `/v1/sys/mounts/${this.projectKvName}`,
        headers: { 'X-Vault-Token': token },
        validateStatus: code => [400, 200, 204].includes(code),
      })
      await this.Policy.deleteAll()
      await this.Group.delete()
      await this.Role.delete()
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
    ensureAll: async () => {
      await this.Policy.upsert(
        this.policyName.appFull,
        `path "${this.projectKvName}/*" { capabilities = ["create", "read", "update", "delete", "list"] }`,
      )
      await this.Policy.upsert(
        this.policyName.techRO,
        `path "${this.coreKvName}/data/${this.projectRootDir}/${this.basePath}/REGISTRY/ro-robot" { capabilities = ["read"] }`,
      )
    },
    deleteAll: async () => {
      await this.Policy.delete(this.policyName.appFull)
      await this.Policy.delete(this.policyName.techRO)
    },
  }

  Group = {
    upsert: async () => {
      const existingGroup = await this.axios({
        method: 'post',
        url: `/v1/identity/group/name/${this.groupName}`,
        headers: { 'X-Vault-Token': await this.getToken() },
        data: {
          name: this.groupName,
          type: 'external',
          policies: [this.policyName.appFull],
        },
      })
      console.log(existingGroup.data)

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

  Role = {
    upsert: async () => {
      const appRoleEnabled = await isAppRoleEnabled(this.axios, await this.getToken())
      if (!appRoleEnabled) return

      await this.axios({
        method: 'post',
        url: `/v1/auth/approle/role/${this.roleName}`,
        data: {
          secret_id_num_uses: '0',
          secret_id_ttl: '0',
          token_max_ttl: '0',
          token_num_uses: '0',
          token_ttl: '0',
          token_type: 'batch',
          token_policies: [this.policyName.techRO, this.policyName.appFull],
        },
        headers: { 'X-Vault-Token': await this.getToken() },
      })
    },

    getCredentials: async (): Promise<AppRoleCredentials> => {
      const appRoleEnabled = await isAppRoleEnabled(this.axios, await this.getToken())
      if (!appRoleEnabled) return this.defaultAppRoleCredentials
      const { data: dataRole } = await this.axios.get(
        `/v1/auth/approle/role/${this.roleName}/role-id`,
        {
          headers: { 'X-Vault-Token': await this.getToken() },
        },
      )
      const { data: dataSecret } = await this.axios.put(
        `/v1/auth/approle/role/${this.roleName}/secret-id`,
        'null', // Force empty data
        {
          headers: { 'X-Vault-Token': await this.getToken() },
        },
      )
      return {
        ...this.defaultAppRoleCredentials,
        roleId: dataRole.data?.role_id,
        secretId: dataSecret.data?.secret_id,
      }
    },
    delete: async () => {
      await this.axios.delete(
        `/v1/auth/approle/role/${this.roleName}`,
        {
          headers: { 'X-Vault-Token': await this.getToken() },
        },
      )
    },
  }
}
