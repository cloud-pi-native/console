import type { CreateDeployment, UpdateDeployment } from '@cpn-console/shared'
import type { FastifyRequest } from 'fastify'
import type { UserContext } from '../infrastructure/auth/auth-user.decorator'
import type { ProjectContext } from '../infrastructure/permission/project/project.guard'
import { CreateDeploymentSchema, UpdateDeploymentSchema } from '@cpn-console/shared'
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Post, Put, Req, UseGuards } from '@nestjs/common'
import { AuthUser } from '../infrastructure/auth/auth-user.decorator'
import { RequireProjectPermission } from '../infrastructure/permission/project/project-permission.decorator'
import { Project } from '../infrastructure/permission/project/project.decorator'
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
  list(@Project() project: ProjectContext) {
    return this.deploymentService.listByProjectId(project.id)
  }

  @Post('')
  @RequireProjectPermission('ManageDeployments')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(CreateDeploymentSchema)) data: CreateDeployment,
    @Project() project: ProjectContext,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ) {
    return this.deploymentService.createDeployment(project.id, data, user.userId, request.id)
  }

  @Put(':deploymentId')
  @RequireProjectPermission('ManageDeployments')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('deploymentId') deploymentId: string, @Body(new ZodValidationPipe(UpdateDeploymentSchema))
    data: UpdateDeployment,
    @Project() project: ProjectContext,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ) {
    return this.deploymentService.updateDeployment(project.id, deploymentId, data, user.userId, request.id)
  }

  @Delete(':deploymentId')
  @RequireProjectPermission('ManageDeployments')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('deploymentId') deploymentId: string,
    @Project() project: ProjectContext,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ) {
    return this.deploymentService.deleteDeployment(project.id, deploymentId, user.userId, request.id)
  }
}
