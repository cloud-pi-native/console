import type { CreateDeployment, UpdateDeployment } from '@cpn-console/shared'
import { CreateDeploymentSchema, UpdateDeploymentSchema } from '@cpn-console/shared'
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Post, Put, Query } from '@nestjs/common'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { DeploymentService } from './deployment.service'

// TODO add auth and project perms guard
@Controller('api/v1/deployments')
export class DeploymentController {
  constructor(@Inject(DeploymentService) private readonly deploymentService: DeploymentService) {}

  @Get('')
  list(@Query('projectId') projectId: string) {
    return this.deploymentService.listByProjectId(projectId)
  }

  @Post('')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(CreateDeploymentSchema)) data: CreateDeployment,
  ) {
    const projectId = data.projectId
    return this.deploymentService.createDeployment(projectId, data)
  }

  @Put('/:deploymentId')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('deploymentId') deploymentId: string, @Body(new ZodValidationPipe(UpdateDeploymentSchema))
    data: UpdateDeployment,
  ) {
    return this.deploymentService.updateDeployment(deploymentId, data)
  }

  @Delete('/:deploymentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('deploymentId') deploymentId: string) {
    return this.deploymentService.deleteDeployment(deploymentId)
  }
}
