import axios, { AxiosInstance } from 'axios'
import { PluginApi, ProjectLite } from '@cpn-console/hooks'
import { removeTrailingSlash, requiredEnv } from '@cpn-console/shared'

type readOptions = {
  throwIfNoEntry: boolean
}

export class VaultProjectApi extends PluginApi {
  private token: string | undefined = undefined
  private axios: AxiosInstance
  private basePath: string
  private projectRootDir: string | undefined

  constructor(project: ProjectLite) {
    super()
    this.basePath = `${project.organization.name}/${project.name}`
    this.projectRootDir = removeTrailingSlash(requiredEnv('PROJECTS_ROOT_DIR'))
    this.axios = axios.create({
      baseURL: requiredEnv('VAULT_URL'),
      headers: {
        'X-Vault-Token': requiredEnv('VAULT_TOKEN'),
      },
    })
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
      url: `/v1/forge-dso/metadata/${this.projectRootDir}/${this.basePath}${path}/`,
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
      `/v1/forge-dso/data/${this.projectRootDir}/${this.basePath}/${path}`,
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
      `/v1/forge-dso/data/${this.projectRootDir}/${this.basePath}/${path}`,
      {
        headers: { 'X-Vault-Token': await this.getToken() },
        data: body,
      })
    return await response.data
  }

  public async destroy(path: string = '/') {
    if (path.startsWith('/')) path = path.slice(1)
    return this.axios.delete(
      `/v1/forge-dso/metadata/${this.projectRootDir}/${this.basePath}/${path}`,
      {
        headers: { 'X-Vault-Token': await this.getToken() },
        method: 'delete',
      })
  }
}
