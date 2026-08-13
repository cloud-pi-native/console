import type { CreateStageBody, Stage, StageAssociatedEnvironments, UpdateStageBody } from '@cpn-console/shared'
import { StageSchema } from '@cpn-console/shared'
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Post, Put, UseGuards } from '@nestjs/common'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { RequireAdminPermission } from '../infrastructure/permission/user/user-admin-permission.decorator'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { StageService } from './stage.service'

@Controller('api/v1/stages')
@UseGuards(UserGuard)
export class StageController {
  constructor(@Inject(StageService) private readonly service: StageService) {}

  @Get()
  async list(): Promise<Stage[]> {
    return this.service.listStages()
  }

  @Get(':stageId/environments')
  @RequireAdminPermission('ListStages')
  async getStageEnvironments(
    @Param('stageId') stageId: string,
  ): Promise<StageAssociatedEnvironments> {
    return this.service.getStageAssociatedEnvironments(stageId)
  }

  @Post()
  @RequireAdminPermission('ManageStages')
  async create(
    @Body(new ZodValidationPipe(StageSchema.omit({ id: true }).partial({ clusterIds: true }))) data: CreateStageBody,
  ): Promise<Stage> {
    return this.service.createStage(data)
  }

  @Put(':stageId')
  @RequireAdminPermission('ManageStages')
  async update(
    @Param('stageId') stageId: string,
    @Body(new ZodValidationPipe(StageSchema.pick({ clusterIds: true, name: true }))) data: UpdateStageBody,
  ): Promise<Stage> {
    return this.service.updateStage(stageId, data)
  }

  @Delete(':stageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAdminPermission('ManageStages')
  async delete(
    @Param('stageId') stageId: string,
  ): Promise<void> {
    await this.service.deleteStage(stageId)
  }
}
