import type { CreateDeployment, UpdateDeployment } from '@cpn-console/shared'
import { CreateDeploymentSchema, UpdateDeploymentSchema } from '@cpn-console/shared'
import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Put, Query } from '@nestjs/common'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe.js'
import { DeploymentService } from './deployment.service.js'

// TODO add auth and project perms guard
@Controller('api/v1/deployments')
export class DeploymentController {
  constructor(@Inject(DeploymentService) private readonly deploymentService: DeploymentService) {}

  @Get('')
  list(@Query('projectId') projectId: string) {
    return this.deploymentService.listByProjectId(projectId)
  }

  @Post('')
  @HttpCode(201)
  create(
    @Body(new ZodValidationPipe(CreateDeploymentSchema)) data: CreateDeployment,
  ) {
    const projectId = data.projectId
    return this.deploymentService.createDeployment(projectId, data)
  }

  @Put('/:deploymentId')
  @HttpCode(200)
  update(
    @Param('deploymentId') deploymentId: string, @Body(new ZodValidationPipe(UpdateDeploymentSchema))
    data: UpdateDeployment,
  ) {
    return this.deploymentService.updateDeployment(deploymentId, data)
  }

  @Delete('/:deploymentId')
  @HttpCode(204)
  delete(@Param('deploymentId') deploymentId: string) {
    return this.deploymentService.deleteDeployment(deploymentId)
  }
}
