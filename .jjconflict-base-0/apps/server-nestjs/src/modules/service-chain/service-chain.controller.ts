import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common'
import { RequireAdminPermission } from '../infrastructure/permission/user/user-admin-permission.decorator'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { ServiceChainService } from './service-chain.service'

@Controller('api/v1/service-chains')
export class ServiceChainController {
  constructor(
    @Inject(ServiceChainService)
    private readonly serviceChainService: ServiceChainService,
  ) {}

  @Post('validate/:validationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(UserGuard)
  @RequireAdminPermission('ManageSystem')
  async validate(@Param('validationId', ParseUUIDPipe) validationId: string) {
    await this.serviceChainService.validate(validationId)
  }

  @Get()
  @UseGuards(UserGuard)
  @RequireAdminPermission('ListSystem')
  async list() {
    return this.serviceChainService.list()
  }

  @Get(':serviceChainId')
  @UseGuards(UserGuard)
  @RequireAdminPermission('ListSystem')
  async getDetails(@Param('serviceChainId', ParseUUIDPipe) id: string) {
    return this.serviceChainService.getDetails(id)
  }

  @Post(':serviceChainId/retry')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(UserGuard)
  @RequireAdminPermission('ManageSystem')
  async retry(@Param('serviceChainId', ParseUUIDPipe) id: string) {
    await this.serviceChainService.retry(id)
  }

  @Get(':serviceChainId/flows')
  @UseGuards(UserGuard)
  @RequireAdminPermission('ListSystem')
  async getFlows(@Param('serviceChainId', ParseUUIDPipe) id: string) {
    return this.serviceChainService.getFlows(id)
  }
}
