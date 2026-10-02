import type { CreateStageBody, Stage, StageAssociatedEnvironments, UpdateStageBody } from '@cpn-console/shared'
import { CreateStageBodySchema, UpdateStageBodySchema } from '@cpn-console/shared'
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Post, Put, UseGuards } from '@nestjs/common'
import { RequireAdminPermission } from '../infrastructure/permission/user/user-admin-permission.decorator'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { StageService } from './stage.service'
import { toStage, toStageAssociatedEnvironments, toStages } from './stage.utils'

@Controller('api/v1/stages')
export class StageController {
  constructor(@Inject(StageService) private readonly service: StageService) {}

  @Get()
  async list(): Promise<Stage[]> {
    return toStages(await this.service.listStages())
  }

  @Get(':stageId/environments')
  @UseGuards(UserGuard)
  @RequireAdminPermission('ListStages')
  async getStageEnvironments(
    @Param('stageId') stageId: string,
  ): Promise<StageAssociatedEnvironments> {
    return toStageAssociatedEnvironments(await this.service.getStageAssociatedEnvironments(stageId))
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(UserGuard)
  @RequireAdminPermission('ManageStages')
  async create(
    @Body(new ZodValidationPipe(CreateStageBodySchema)) data: CreateStageBody,
  ): Promise<Stage> {
    return toStage(await this.service.createStage(data))
  }

  @Put(':stageId')
  @UseGuards(UserGuard)
  @RequireAdminPermission('ManageStages')
  async update(
    @Param('stageId') stageId: string,
    @Body(new ZodValidationPipe(UpdateStageBodySchema)) data: UpdateStageBody,
  ): Promise<Stage> {
    return toStage(await this.service.updateStage(stageId, data))
  }

  @Delete(':stageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(UserGuard)
  @RequireAdminPermission('ManageStages')
  async delete(
    @Param('stageId') stageId: string,
  ): Promise<void> {
    await this.service.deleteStage(stageId)
  }
}
