import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { Inject, Injectable } from '@nestjs/common'
import axios from 'axios'
import type { AxiosInstance } from 'axios'
import { removeTrailingSlash } from './nexus.utils'

@Injectable()
export class NexusClientService {
  readonly axios: AxiosInstance

  constructor(
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {
    this.axios = axios.create({
      baseURL: `${removeTrailingSlash(this.config.nexusInternalUrl!)}/service/rest/v1/`,
      auth: {
        username: this.config.nexusAdmin!,
        password: this.config.nexusAdminPassword!,
      },
      headers: {
        Accept: 'application/json',
      },
    })
  }

  async deleteIfExists(path: string) {
    return this.axios({
      method: 'delete',
      url: path,
      validateStatus: code => code === 404 || code < 300,
    })
  }
}
