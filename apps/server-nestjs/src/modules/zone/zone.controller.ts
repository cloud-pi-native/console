import type { FastifyRequest } from 'fastify'
import type { UserContext } from '../infrastructure/auth/auth-user.decorator'
import type { Zone as ZoneType } from './zone-queries.utils'
import { zoneContract } from '@cpn-console/shared'
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Post, Put, Req, UseGuards } from '@nestjs/common'
import { AuthUser } from '../infrastructure/auth/auth-user.decorator'
import { RequireAdminPermission } from '../infrastructure/permission/user/user-admin-permission.decorator'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { ZoneService } from './zone.service'

@Controller('api/v1/zones')
@UseGuards(UserGuard)
export class ZoneController {
  constructor(@Inject(ZoneService) private readonly zoneService: ZoneService) {}

  @Get()
  async list(): Promise<ZoneType[]> {
    return this.zoneService.list()
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireAdminPermission('ManageZones')
  async create(
    @Body(new ZodValidationPipe(zoneContract.createZone.body)) body: typeof zoneContract.createZone.body._type,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<ZoneType> {
    return this.zoneService.create(body, user.userId, request.id)
  }

  @Put(':zoneId')
  @RequireAdminPermission('ManageZones')
  async update(
    @Param('zoneId') zoneId: string,
    @Body(new ZodValidationPipe(zoneContract.updateZone.body)) body: typeof zoneContract.updateZone.body._type,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<ZoneType> {
    return this.zoneService.update(zoneId, body, user.userId, request.id)
  }

  @Delete(':zoneId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAdminPermission('ManageZones')
  async delete(
    @Param('zoneId') zoneId: string,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<void> {
    return this.zoneService.delete(zoneId, user.userId, request.id)
  }
}
