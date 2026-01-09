import getConfig from './config.js'
import { VaultApi } from './vault-api.js'

interface VaultCredentials {
  url: string
  kvName: string
  roleId: string
  secretId: string
}
type VaultValues = VaultCredentials

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
    return this.getCredentials()
  }
}
