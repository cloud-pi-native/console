import type { ServiceChain, ServiceChainDetails, ServiceChainFlows } from '@cpn-console/shared'
import {
  ServiceChainDetailsSchema,
  ServiceChainFlowsSchema,
  ServiceChainListSchema,
} from '@cpn-console/shared'
import { Inject, Injectable } from '@nestjs/common'
import { StartActiveSpan } from '../../cpin-module/infrastructure/telemetry/telemetry.decorator'
import { OpenCdsClientService } from './open-cds-client.service'

@Injectable()
export class ServiceChainService {
  constructor(@Inject(OpenCdsClientService) private readonly openCdsClient: OpenCdsClientService) {}

  @StartActiveSpan()
  async list(): Promise<ServiceChain[]> {
    return ServiceChainListSchema.parse(
      await this.openCdsClient.get('/requests'),
    )
  }

  @StartActiveSpan()
  async getDetails(id: string): Promise<ServiceChainDetails> {
    return ServiceChainDetailsSchema.parse(
      await this.openCdsClient.get(`/requests/${id}`),
    )
  }

  @StartActiveSpan()
  async retry(id: string): Promise<void> {
    await this.openCdsClient.post(`/requests/${id}/retry`)
  }

  @StartActiveSpan()
  async validate(validationId: string): Promise<void> {
    await this.openCdsClient.post(`/validate/${validationId}`)
  }

  @StartActiveSpan()
  async getFlows(id: string): Promise<ServiceChainFlows> {
    return ServiceChainFlowsSchema.parse(
      await this.openCdsClient.get(`/requests/${id}/flows`),
    )
  }
}
