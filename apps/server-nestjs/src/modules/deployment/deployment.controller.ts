import type { CreateDeployment, UpdateDeployment } from '@cpn-console/shared'
import type { ProjectExecutionContext } from '../infrastructure/permission/project/project-context.decorator'
import { CreateDeploymentSchema, UpdateDeploymentSchema } from '@cpn-console/shared'
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Post, Put, UseGuards } from '@nestjs/common'
import { ProjectContext } from '../infrastructure/permission/project/project-context.decorator'
import { ProjectId } from '../infrastructure/permission/project/project-id.decorator'
import { RequireProjectPermission } from '../infrastructure/permission/project/project-permission.decorator'
import { ProjectGuard } from '../infrastructure/permission/project/project.guard'
import { RequireAdminPermission } from '../infrastructure/permission/user/user-admin-permission.decorator'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { DeploymentService } from './deployment.service'

@Controller('api/v1/projects/:projectId/deployments')
@UseGuards(ProjectGuard)
export class DeploymentController {
  constructor(@Inject(DeploymentService) private readonly deploymentService: DeploymentService) {}

  @Get('')
  @RequireAdminPermission('ListProjects')
  @RequireProjectPermission('ListDeployments')
  list(@ProjectId() projectId: string) {
    return this.deploymentService.listByProjectId(projectId)
  }

  @Post('')
  @RequireProjectPermission('ManageDeployments')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(CreateDeploymentSchema)) data: CreateDeployment,
    @ProjectContext() projectCtx: ProjectExecutionContext,
  ) {
    return this.deploymentService.createDeployment(projectCtx, data)
  }

  @Put(':deploymentId')
  @RequireProjectPermission('ManageDeployments')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('deploymentId') deploymentId: string, @Body(new ZodValidationPipe(UpdateDeploymentSchema))
    data: UpdateDeployment,
    @ProjectContext() projectCtx: ProjectExecutionContext,
  ) {
    return this.deploymentService.updateDeployment(projectCtx, deploymentId, data)
  }

  @Delete(':deploymentId')
  @RequireProjectPermission('ManageDeployments')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('deploymentId') deploymentId: string,
    @ProjectContext() projectCtx: ProjectExecutionContext,
  ) {
    return this.deploymentService.deleteDeployment(projectCtx, deploymentId)
  }
}
