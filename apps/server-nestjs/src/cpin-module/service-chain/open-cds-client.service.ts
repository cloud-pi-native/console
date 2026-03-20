import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import https from 'node:https'
import { Inject, Injectable } from '@nestjs/common'
import axios from 'axios'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'

const openCdsDisabledMessage = 'OpenCDS is disabled, please set OPENCDS_URL in your relevant .env file. See .env-example'

@Injectable()
export class OpenCdsClientService {
  constructor(@Inject(ConfigurationService) private readonly config: ConfigurationService) {}

  async get<T>(url: string, requestConfig?: AxiosRequestConfig): Promise<T> {
    return (await this.getClient().get<T>(url, requestConfig)).data
  }

  async post(url: string, data?: unknown, requestConfig?: AxiosRequestConfig): Promise<void> {
    await this.getClient().post(url, data, requestConfig)
  }

  private getClient(): AxiosInstance {
    if (!this.config.openCdsUrl) {
      throw new Error(openCdsDisabledMessage)
    }

    return axios.create({
      baseURL: this.config.openCdsUrl,
      httpsAgent: new https.Agent({
        rejectUnauthorized: this.config.openCdsApiTlsRejectUnauthorized,
      }),
      headers: {
        'X-API-Key': this.config.openCdsApiToken,
      },
    })
  }
}
