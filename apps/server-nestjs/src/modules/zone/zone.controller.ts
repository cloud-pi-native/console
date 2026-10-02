import type { CreateZoneBody, UpdateZoneBody, Zone } from '@cpn-console/shared'
import type { FastifyRequest } from 'fastify'
import type { UserContext } from '../infrastructure/auth/auth-user.decorator'
import { zoneContract } from '@cpn-console/shared'
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Post, Put, Req, UseGuards } from '@nestjs/common'
import { AuthUser } from '../infrastructure/auth/auth-user.decorator'
import { RequireAdminPermission } from '../infrastructure/permission/user/user-admin-permission.decorator'
import { RequireUserType } from '../infrastructure/permission/user/user-type.decorator'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { ZoneService } from './zone.service'
import { toZone, toZones } from './zone.utils'

@Controller('api/v1/zones')
export class ZoneController {
  constructor(@Inject(ZoneService) private readonly zoneService: ZoneService) {}

  @Get()
  async list(): Promise<Zone[]> {
    return toZones(await this.zoneService.list())
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(UserGuard)
  @RequireUserType('human')
  @RequireAdminPermission('ManageZones')
  async create(
    @Body(new ZodValidationPipe(zoneContract.createZone.body)) body: CreateZoneBody,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<Zone> {
    return toZone(await this.zoneService.create(body, user.userId, request.id))
  }

  @Put(':zoneId')
  @UseGuards(UserGuard)
  @RequireUserType('human')
  @RequireAdminPermission('ManageZones')
  async update(
    @Param('zoneId') zoneId: string,
    @Body(new ZodValidationPipe(zoneContract.updateZone.body)) body: UpdateZoneBody,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<Zone> {
    return toZone(await this.zoneService.update(zoneId, body, user.userId, request.id))
  }

  @Delete(':zoneId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(UserGuard)
  @RequireUserType('human')
  @RequireAdminPermission('ManageZones')
  async delete(
    @Param('zoneId') zoneId: string,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<void> {
    return this.zoneService.delete(zoneId, user.userId, request.id)
  }
}
