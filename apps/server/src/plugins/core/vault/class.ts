import axios, { AxiosInstance } from 'axios'
import { vaultToken, vaultUrl } from './utils.js'
import { projectRootDir } from '@/utils/env.js'

export class VaultProjectApi {
  private token: string
  private axios: AxiosInstance
  private basePath: string

  constructor (organizationName: string, projectName: string) {
    this.basePath = `${organizationName}/${projectName}`
    this.axios = axios.create({
      baseURL: vaultUrl,
      headers: {
        'X-Vault-Token': vaultToken,
      },
    })
  }

  private async getToken () {
    return this.token ||
      (await this.axios.post('/v1/auth/token/create'))
        .data.auth.client_token
  }

  public async list (path: string = '/') {
    if (!path.startsWith('/')) path = '/' + path

    const listSecretPath = []
    const response = await this.axios({
      baseURL: `${vaultUrl}`,
      url: `/v1/forge-dso/metadata/${projectRootDir}/${this.basePath}${path}/`,
      headers: {
        'X-Vault-Token': await this.getToken(),
      },
      method: 'list',
      validateStatus: (code) => [200, 404].includes(code),
    })

    if (response.status === 404) return listSecretPath
    for (const key of response.data.data.keys) {
      if (key.endsWith('/')) {
        const subSecrets = await this.list(`${path.substring(this.basePath.length)}/${key}`)
        subSecrets.forEach(secret => {
          listSecretPath.push(`${key}${secret}`)
        })
      } else {
        listSecretPath.push('/' + key)
      }
    }
    return listSecretPath.flat(-1)
  }

  public async read (path: string = '/') {
    if (path.startsWith('/')) path = path.slice(1)
    const response = await this.axios.get(
      `/v1/forge-dso/data/${projectRootDir}/${this.basePath}/${path}`,
      { headers: { 'X-Vault-Token': await this.getToken() } },
    )
    return await response.data.data
  }

  public async write (path: string = '/', body: object) {
    if (path.startsWith('/')) path = path.slice(1)
    const response = await this.axios.post(
      `/v1/forge-dso/data/${projectRootDir}/${this.basePath}/${path}`,
      {
        headers: { 'X-Vault-Token': await this.getToken() },
        data: body,
      })
    return await response.data
  }

  public async destroy (path: string = '/') {
    if (path.startsWith('/')) path = path.slice(1)
    return this.axios.delete(
      `/v1/forge-dso/metadata/${projectRootDir}/${this.basePath}/${path}`,
      {
        headers: { 'X-Vault-Token': await this.getToken() },
        method: 'delete',
      })
  }
}
