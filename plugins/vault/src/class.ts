import axios, { AxiosInstance } from 'axios'
import { PluginApi, ProjectLite } from '@cpn-console/hooks'
import { removeTrailingSlash, requiredEnv } from '@cpn-console/shared'

type readOptions = {
  throwIfNoEntry: boolean
}
type AppRoleCredentials = {
  url: string
  kvName: string
  roleId: string
  secretId: string
}

export class VaultProjectApi extends PluginApi {
  private token: string | undefined = undefined
  private axios: AxiosInstance
  private kvName: string = 'forge-dso'
  private basePath: string
  private roleName: string
  private projectRootDir: string | undefined
  private defaultAppRoleCredentials: AppRoleCredentials

  constructor(project: ProjectLite) {
    super()
    this.basePath = `${project.organization.name}/${project.name}`
    this.roleName = `${project.organization.name}-${project.name}`
    this.projectRootDir = removeTrailingSlash(requiredEnv('PROJECTS_ROOT_DIR'))
    this.axios = axios.create({
      baseURL: requiredEnv('VAULT_URL'),
      headers: {
        'X-Vault-Token': requiredEnv('VAULT_TOKEN'),
      },
    })
    this.defaultAppRoleCredentials = {
      url: removeTrailingSlash(requiredEnv('VAULT_URL')),
      kvName: this.kvName,
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
    if (!path.startsWith('/')) path = '/' + path

    const listSecretPath: string[] = []
    const response = await this.axios({
      url: `/v1/${this.kvName}/metadata/${this.projectRootDir}/${this.basePath}${path}/`,
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
        listSecretPath.push('/' + key)
      }
    }
    return listSecretPath.flat()
  }

  public async read(path: string = '/', options: readOptions = { throwIfNoEntry: true }) {
    if (path.startsWith('/')) path = path.slice(1)
    const response = await this.axios.get(
      `/v1/${this.kvName}/data/${this.projectRootDir}/${this.basePath}/${path}`,
      {
        headers: { 'X-Vault-Token': await this.getToken() },
        validateStatus: status => (options.throwIfNoEntry ? [200] : [200, 404]).includes(status),
      },
    )
    return await response.data.data
  }

  public async write(body: object, path: string = '/') {
    if (path.startsWith('/')) path = path.slice(1)
    const response = await this.axios.post(
      `/v1/${this.kvName}/data/${this.projectRootDir}/${this.basePath}/${path}`,
      {
        headers: { 'X-Vault-Token': await this.getToken() },
        data: body,
      })
    return await response.data
  }

  async upsertPolicy() {
    await this.axios.put(
      `/v1/sys/policies/acl/${this.roleName}`,
      { policy: `path "${this.kvName}/data/${this.projectRootDir}/${this.basePath}/*" { capabilities = ["create", "read", "update", "delete", "list"] }` },
      {
        headers: {
          'X-Vault-Token': await this.getToken(),
          'Content-Type': 'application/json',
        },
      },
    )
  }

  async isAppRoleEnabled() {
    const response = await this.axios.get(
      '/v1/sys/auth',
      {
        headers: { 'X-Vault-Token': await this.getToken() },
      },
    )
    return Object.keys(response.data).includes('approle/')
  }

  public async upsertRole() {
    const appRoleEnabled = await this.isAppRoleEnabled()
    if (!appRoleEnabled) return
    this.upsertPolicy()
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
    if (path.startsWith('/')) path = path.slice(1)
    return this.axios.delete(
      `/v1/${this.kvName}/metadata/${this.projectRootDir}/${this.basePath}/${path}`,
      {
        headers: { 'X-Vault-Token': await this.getToken() },
      })
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
}
