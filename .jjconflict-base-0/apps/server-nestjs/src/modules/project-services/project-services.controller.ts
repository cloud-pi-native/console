import type { PermissionTarget, PluginsUpdateBody } from '@cpn-console/shared'
import type { UserContext } from '../infrastructure/auth/auth-user.decorator'
import type { ProjectContext } from '../infrastructure/permission/project/project.guard'
import { AdminAuthorized, projectServiceContract } from '@cpn-console/shared'
import { Body, Controller, ForbiddenException, Get, HttpCode, HttpStatus, Inject, Post, Query, UseGuards } from '@nestjs/common'
import { AuthUser } from '../infrastructure/auth/auth-user.decorator'
import { RequireProjectLocked } from '../infrastructure/permission/project/project-locked.decorator'
import { RequireProjectPermission } from '../infrastructure/permission/project/project-permission.decorator'
import { RequireProjectStatus } from '../infrastructure/permission/project/project-status.decorator'
import { Project } from '../infrastructure/permission/project/project.decorator'
import { ProjectGuard } from '../infrastructure/permission/project/project.guard'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { ProjectServicesService } from './project-services.service'

@Controller('api/v1/projects/:projectId/services')
@UseGuards(ProjectGuard)
export class ProjectServicesController {
  constructor(
    @Inject(ProjectServicesService) private readonly projectServices: ProjectServicesService,
  ) {}

  @Get()
  @RequireProjectPermission('ListEnvironments')
  async get(
    @Query(new ZodValidationPipe(projectServiceContract.getServices.query)) query: { permissionTarget: PermissionTarget },
    @Project() project: ProjectContext,
    @AuthUser() user: UserContext,
  ) {
    if (query.permissionTarget === 'admin' && !AdminAuthorized.Manage(user.adminPermissions ?? 0n)) {
      throw new ForbiddenException('Vous ne pouvez pas demander les paramètres admin')
    }

    return this.projectServices.get(project.id, query.permissionTarget)
  }

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireProjectPermission('ManageEnvironments')
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectLocked(false)
  async update(
    @Body(new ZodValidationPipe(projectServiceContract.updateProjectServices.body)) body: PluginsUpdateBody,
    @Project() project: ProjectContext,
    @AuthUser() user: UserContext,
  ): Promise<void> {
    const allowedRoles: Array<'user' | 'admin'> = AdminAuthorized.Manage(user.adminPermissions ?? 0n) ? ['user', 'admin'] : ['user']
    await this.projectServices.update(project.id, body, allowedRoles)
  }
}
