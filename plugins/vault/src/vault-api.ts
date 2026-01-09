import type { AxiosInstance } from 'axios'
import axios from 'axios'
import { PluginApi } from '@cpn-console/hooks'
import getConfig from './config.js'
import {
  generateKVConfigUpdate,
} from './utils.js'

export interface AppRoleCredentials {
  url: string
  coreKvName: string
  roleId: string
  secretId: string
}

export abstract class VaultApi extends PluginApi {
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
