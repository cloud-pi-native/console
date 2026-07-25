import type { CreateEnvironment, UpdateEnvironment } from '@cpn-console/shared'
import type { Environment } from '@prisma/client'
import type { FastifyRequest } from 'fastify'
import type { UserContext } from '../infrastructure/auth/auth-user.decorator'
import type { ProjectContext } from '../infrastructure/permission/project/project.guard'
import type { EnvironmentWithStage } from './environment-datastore.service'
import { CreateEnvironmentSchema, UpdateEnvironmentSchema } from '@cpn-console/shared'
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, ParseUUIDPipe, Post, Put, Req, UseGuards } from '@nestjs/common'
import { AuthUser } from '../infrastructure/auth/auth-user.decorator'
import { RequireProjectLocked } from '../infrastructure/permission/project/project-locked.decorator'
import { RequireProjectPermission } from '../infrastructure/permission/project/project-permission.decorator'
import { RequireProjectStatus } from '../infrastructure/permission/project/project-status.decorator'
import { Project } from '../infrastructure/permission/project/project.decorator'
import { ProjectGuard } from '../infrastructure/permission/project/project.guard'
import { RequireAdminPermission } from '../infrastructure/permission/user/user-admin-permission.decorator'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { EnvironmentService } from './environment.service'

@Controller('api/v2/projects/:projectId/environments')
@UseGuards(ProjectGuard)
export class EnvironmentController {
  constructor(@Inject(EnvironmentService) private readonly environmentService: EnvironmentService) {}

  @Get('')
  @RequireAdminPermission('ListProjects')
  @RequireProjectPermission('ListEnvironments')
  list(@Project() project: ProjectContext): Promise<EnvironmentWithStage[]> {
    return this.environmentService.listByProjectId(project.id)
  }

  @Post('')
  @RequireProjectPermission('ManageEnvironments')
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectLocked(false)
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(CreateEnvironmentSchema)) data: CreateEnvironment,
    @Project() project: ProjectContext,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<Environment> {
    return this.environmentService.createEnvironment(project.id, data, user.userId, request.id)
  }

  @Put(':environmentId')
  @RequireProjectPermission('ManageEnvironments')
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectLocked(false)
  @HttpCode(HttpStatus.OK)
  update(
    @Param('environmentId', ParseUUIDPipe) environmentId: string,
    @Body(new ZodValidationPipe(UpdateEnvironmentSchema)) data: UpdateEnvironment,
    @Project() project: ProjectContext,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<Environment> {
    return this.environmentService.updateEnvironment(project.id, environmentId, data, user.userId, request.id)
  }

  @Delete(':environmentId')
  @RequireProjectPermission('ManageEnvironments')
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectLocked(false)
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('environmentId', ParseUUIDPipe) environmentId: string,
    @Project() project: ProjectContext,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<void> {
    return this.environmentService.deleteEnvironment(project.id, environmentId, user.userId, request.id)
  }
}
