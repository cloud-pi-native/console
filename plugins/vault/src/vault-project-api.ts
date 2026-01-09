import type { ProjectLite } from '@cpn-console/hooks'
import getConfig from './config.js'
import {
  getAuthMethod,
} from './utils.js'
import { VaultApi } from './vault-api.js'

interface ReadOptions {
  throwIfNoEntry: boolean
}
export interface AppRoleCredentials {
  url: string
  coreKvName: string
  roleId: string
  secretId: string
}

interface VaultValuesWithoutCredentials {
  /** Slash-separated directory (root node of all Gitlab projects) */
  projectsRootDir: string
}

type VaultValues = AppRoleCredentials & VaultValuesWithoutCredentials

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
    getCredentials: async (): Promise<AppRoleCredentials> => {
      const creds = await this.Role.getCredentials(this.roleName)
      return {
        ...this.defaultAppRoleCredentials,
        ...creds,
      }
    },
    getValues: async (): Promise<VaultValues> => {
      return {
        projectsRootDir: getConfig().projectsRootDir,
        ...(await this.Project.getCredentials()),
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
