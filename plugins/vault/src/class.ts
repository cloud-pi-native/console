import type { AxiosInstance } from 'axios'
import axios from 'axios'
import type { ProjectLite } from '@cpn-console/hooks'
import { PluginApi } from '@cpn-console/hooks'
import { removeTrailingSlash, requiredEnv } from '@cpn-console/shared'

interface readOptions {
  throwIfNoEntry: boolean
}
interface AppRoleCredentials {
  url: string
  coreKvName: string
  roleId: string
  secretId: string
}

export class VaultProjectApi extends PluginApi {
  private token: string | undefined = undefined
  private axios: AxiosInstance
  private coreKvName: string = 'forge-dso'
  private projectKvName: string
  private groupName: string
  private policyName: string
  private basePath: string
  private roleName: string
  private projectRootDir: string | undefined
  private defaultAppRoleCredentials: AppRoleCredentials

  constructor(project: ProjectLite) {
    super()
    this.basePath = `${project.organization.name}/${project.name}`
    this.roleName = `${project.organization.name}-${project.name}`
    this.projectKvName = `${project.organization.name}-${project.name}`
    this.groupName = `${project.organization.name}-${project.name}`
    this.policyName = `${project.organization.name}-${project.name}`
    this.projectRootDir = removeTrailingSlash(requiredEnv('PROJECTS_ROOT_DIR'))
    this.axios = axios.create({
      baseURL: requiredEnv('VAULT_URL'),
      headers: {
        'X-Vault-Token': requiredEnv('VAULT_TOKEN'),
      },
    })
    this.defaultAppRoleCredentials = {
      url: removeTrailingSlash(requiredEnv('VAULT_URL')),
      coreKvName: this.coreKvName,
      roleId: 'none',
      secretId: 'none',
    }
  }

  private async getToken() {
    return this.token
      || (await this.axios.post('/v1/auth/token/create'))
        .data.auth.client_token
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

  public async read(path: string = '/', options: readOptions = { throwIfNoEntry: true }) {
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

  async upsertPolicy(policyName: string, policy: string) {
    await this.axios.put(
      `/v1/sys/policies/acl/${policyName}`,
      { policy },
      {
        headers: {
          'X-Vault-Token': await this.getToken(),
          'Content-Type': 'application/json',
        },
      },
    )
  }

  async getAuthMethod() {
    const response = await this.axios.get(
      '/v1/sys/auth',
      {
        headers: { 'X-Vault-Token': await this.getToken() },
      },
    )
    return response.data
  }

  async isAppRoleEnabled() {
    const methods = await this.getAuthMethod()
    return Object.keys(methods).includes('approle/')
  }

  public async upsertRole() {
    const appRoleEnabled = await this.isAppRoleEnabled()
    if (!appRoleEnabled) return
    this.upsertPolicy(
      this.roleName,
      `path "${this.coreKvName}/data/${this.projectRootDir}/${this.basePath}/*" { capabilities = ["create", "read", "update", "delete", "list"] }`,
    )
    this.axios.post(
      `/v1/auth/approle/role/${this.roleName}`,
      {
        secret_id_num_uses: '40',
        secret_id_ttl: '10m',
        token_max_ttl: '30m',
        token_num_uses: '0',
        token_ttl: '20m',
        token_type: 'batch',
        token_policies: this.roleName,
      },
      {
        headers: { 'X-Vault-Token': await this.getToken() },
      },
    )
  }

  public async getAppRoleCredentials(): Promise<AppRoleCredentials> {
    const appRoleEnabled = await this.isAppRoleEnabled()
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
  }

  public async destroy(path: string = '/') {
    if (path.startsWith('/'))
      path = path.slice(1)
    return this.axios.delete(
      `/v1/${this.coreKvName}/metadata/${this.projectRootDir}/${this.basePath}/${path}`,
      {
        headers: { 'X-Vault-Token': await this.getToken() },
      },
    )
  }

  public async destroyRole() {
    await this.axios.delete(
      `/v1/auth/approle/role/${this.roleName}`,
      {
        headers: { 'X-Vault-Token': await this.getToken() },
      },
    )
    await this.axios.delete(
      `/v1/sys/policies/acl/${this.roleName}`,
      {
        headers: { 'X-Vault-Token': await this.getToken() },
      },
    )
  }

  public async upsertKv() {
    const appRoleEnabled = await this.isAppRoleEnabled()
    if (!appRoleEnabled) return
    this.createKv(this.projectKvName)
    this.upsertPolicy(
      this.policyName,
      `path "${this.projectKvName}/*" { capabilities = ["create", "read", "update", "delete", "list"] }\n\npath "/v1/sys/policies/acl/${this.policyName}/*" { capabilities = ["create", "read", "update", "list"] }`,
    )
    const group = await this.createGroup(this.groupName, this.policyName)
    this.createGroupAlias(this.groupName, group.id)
  }

  public async createKv(kvName: string) {
    await this.axios.post(
      `/v1/sys/mounts/${kvName}`,
      {
        headers: { 'X-Vault-Token': await this.getToken() },
        data: {
          type: 'kv',
          options: {
            version: 2,
          },
        },
      },
    )
  }

  public async createGroup(group: string, policyName: string) {
    const response = await this.axios.post(
      `/v1/identity/group/${group}`,
      {
        headers: { 'X-Vault-Token': await this.getToken() },
        data: {
          name: group,
          type: 'external',
          policies: [policyName],
        },
      },
    )
    return response.data
  }

  public async createGroupAlias(groupAlias: string, groupId: string) {
    const methods = await this.getAuthMethod()
    const response = await this.axios.post(
      `/v1/identity/group/${groupAlias}`,
      {
        headers: { 'X-Vault-Token': await this.getToken() },
        data: {
          name: groupAlias,
          mount_accessor: methods['oidc/'].accessor,
          canonical_id: groupId,
        },
      },
    )
    return response.data
  }
}
