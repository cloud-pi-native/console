import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import type { CreateZoneBody, UpdateZoneBody } from '@cpn-console/shared'
import { AuthUser } from '../infrastructure/auth/auth-user.decorator'
import type { UserContext } from '../infrastructure/auth/auth-user.decorator'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { RequireAdminPermission } from '../infrastructure/permission/user/user-admin-permission.decorator'
import type { Zone as ZoneType } from './zone-queries.utils'
import { ZoneService } from './zone.service'

@Controller('api/v1/zones')
@UseGuards(UserGuard)
export class ZoneController {
  constructor(private readonly zoneService: ZoneService) {}

  @Get('')
  async list(): Promise<ZoneType[]> {
    return this.zoneService.list()
  }

  @Post('')
  @RequireAdminPermission('ManageZones')
  async create(
    @Body() body: CreateZoneBody,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<ZoneType> {
    return this.zoneService.create(body, user.userId, request.id)
  }

  @Put(':zoneId')
  @RequireAdminPermission('ManageZones')
  async update(
    @Param('zoneId') zoneId: string,
    @Body() body: UpdateZoneBody,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<ZoneType> {
    return this.zoneService.update(zoneId, body, user.userId, request.id)
  }

  @Delete(':zoneId')
  @RequireAdminPermission('ManageZones')
  async delete(
    @Param('zoneId') zoneId: string,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<void> {
    return this.zoneService.delete(zoneId, user.userId, request.id)
  }
}
