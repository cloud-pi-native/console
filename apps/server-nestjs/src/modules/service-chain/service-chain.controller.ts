import { Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Post } from '@nestjs/common'
import { ServiceChainService } from './service-chain.service'

@Controller('api/v1/service-chains')
export class ServiceChainController {
  constructor(@Inject(ServiceChainService) private readonly serviceChainService: ServiceChainService) {}

  @Post('validate/:validationId')
  @HttpCode(204)
  async validate(@Param('validationId', ParseUUIDPipe) validationId: string) {
    await this.serviceChainService.validate(validationId)
  }

  @Get()
  async list() {
    return this.serviceChainService.list()
  }

  @Get(':serviceChainId')
  async getDetails(@Param('serviceChainId', ParseUUIDPipe) id: string) {
    return this.serviceChainService.getDetails(id)
  }

  @Post(':serviceChainId/retry')
  @HttpCode(204)
  async retry(@Param('serviceChainId', ParseUUIDPipe) id: string) {
    await this.serviceChainService.retry(id)
  }

  @Get(':serviceChainId/flows')
  async getFlows(@Param('serviceChainId', ParseUUIDPipe) id: string) {
    return this.serviceChainService.getFlows(id)
  }
}
