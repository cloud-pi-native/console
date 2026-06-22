import type { PermissionTarget, PluginsUpdateBody } from '@cpn-console/shared'
import type { UserContext } from '../infrastructure/auth/auth.service.js'
import type { ProjectContext } from '../infrastructure/permission/project/project.guard.js'
import { AdminAuthorized, projectServiceContract } from '@cpn-console/shared'
import { Body, Controller, ForbiddenException, Get, HttpCode, Inject, Post, Query, UseGuards } from '@nestjs/common'
import { AuthUser } from '../infrastructure/auth/auth-user.decorator.js'
import { RequireProjectLocked } from '../infrastructure/permission/project/project-locked.decorator.js'
import { RequireProjectPermission } from '../infrastructure/permission/project/project-permission.decorator.js'
import { RequireProjectStatus } from '../infrastructure/permission/project/project-status.decorator.js'
import { Project } from '../infrastructure/permission/project/project.decorator.js'
import { ProjectGuard } from '../infrastructure/permission/project/project.guard.js'
import { UserGuard } from '../infrastructure/permission/user/user.guard.js'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { ProjectServicesService } from './project-services.service'

@Controller('api/v1/projects')
@UseGuards(UserGuard, ProjectGuard)
export class ProjectServicesController {
  constructor(
    @Inject(ProjectServicesService) private readonly projectServicesService: ProjectServicesService,
  ) {}

  @Get('/:projectId/services')
  @RequireProjectPermission('Member')
  async getServices(
    @Query(new ZodValidationPipe(projectServiceContract.getServices.query)) query: { permissionTarget: PermissionTarget },
    @Project() project: ProjectContext,
    @AuthUser() user: UserContext,
  ) {
    if (query.permissionTarget === 'admin' && !AdminAuthorized.Manage(user.adminPermissions ?? 0n)) {
      throw new ForbiddenException('Vous ne pouvez pas demander les paramètres admin')
    }

    return this.projectServicesService.getProjectServices(project.id, query.permissionTarget)
  }

  @Post('/:projectId/services')
  @HttpCode(204)
  @RequireProjectPermission('Member')
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectLocked(false)
  async updateProjectServices(
    @Body(new ZodValidationPipe(projectServiceContract.updateProjectServices.body)) body: PluginsUpdateBody,
    @Project() project: ProjectContext,
    @AuthUser() user: UserContext,
  ): Promise<void> {
    const allowedRoles: Array<'user' | 'admin'> = AdminAuthorized.Manage(user.adminPermissions ?? 0n) ? ['user', 'admin'] : ['user']
    await this.projectServicesService.updateProjectServices(project.id, body, allowedRoles)
  }
}
