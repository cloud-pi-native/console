import {
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common'
import { RequireAdminPermission } from '../infrastructure/auth/admin/admin-permission.decorator'
import { AdminGuard } from '../infrastructure/auth/admin/admin.guard'
import { ServiceChainService } from './service-chain.service'

@Controller('api/v1/service-chains')
export class ServiceChainController {
  constructor(
    @Inject(ServiceChainService)
    private readonly serviceChainService: ServiceChainService,
  ) {}

  @Post('validate/:validationId')
  @HttpCode(204)
  @UseGuards(AdminGuard)
  @RequireAdminPermission('ManageSystem')
  async validate(@Param('validationId', ParseUUIDPipe) validationId: string) {
    await this.serviceChainService.validate(validationId)
  }

  @Get()
  @UseGuards(AdminGuard)
  @RequireAdminPermission('ListSystem')
  async list() {
    return this.serviceChainService.list()
  }

  @Get(':serviceChainId')
  @UseGuards(AdminGuard)
  @RequireAdminPermission('ListSystem')
  async getDetails(@Param('serviceChainId', ParseUUIDPipe) id: string) {
    return this.serviceChainService.getDetails(id)
  }

  @Post(':serviceChainId/retry')
  @HttpCode(204)
  @UseGuards(AdminGuard)
  @RequireAdminPermission('ManageSystem')
  async retry(@Param('serviceChainId', ParseUUIDPipe) id: string) {
    await this.serviceChainService.retry(id)
  }

  @Get(':serviceChainId/flows')
  @UseGuards(AdminGuard)
  @RequireAdminPermission('ListSystem')
  async getFlows(@Param('serviceChainId', ParseUUIDPipe) id: string) {
    return this.serviceChainService.getFlows(id)
  }
}
