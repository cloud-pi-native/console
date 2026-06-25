import type { ProjectContext } from '../../infrastructure/permission/project/project.guard.js'
import { projectRoleContract } from '@cpn-console/shared'
import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { RequireProjectLocked } from '../../infrastructure/permission/project/project-locked.decorator.js'
import { RequireProjectPermission } from '../../infrastructure/permission/project/project-permission.decorator.js'
import { RequireProjectStatus } from '../../infrastructure/permission/project/project-status.decorator.js'
import { Project } from '../../infrastructure/permission/project/project.decorator.js'
import { ProjectGuard } from '../../infrastructure/permission/project/project.guard.js'
import { ZodValidationPipe } from '../../infrastructure/pipe/zod-validation.pipe.js'
import { ProjectRolesService } from './project-roles.service.js'

@Controller('api/v1/projects')
@UseGuards(ProjectGuard)
export class ProjectRolesController {
  constructor(
    @Inject(ProjectRolesService) private readonly projectRoles: ProjectRolesService,
  ) {}

  @Get('/:projectId/roles')
  @RequireProjectPermission('ListRoles')
  async listProjectRoles(
    @Project() project: ProjectContext,
  ) {
    return this.projectRoles.listRoles(project.id)
  }

  @Post('/:projectId/roles')
  @HttpCode(201)
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectLocked(false)
  @RequireProjectPermission('ManageRoles')
  async createProjectRole(
    @Body(new ZodValidationPipe(projectRoleContract.createProjectRole.body)) body: typeof projectRoleContract.createProjectRole.body._type,
    @Project() project: ProjectContext,
  ) {
    return this.projectRoles.createRole(project.id, body)
  }

  @Patch('/:projectId/roles')
  @HttpCode(200)
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectLocked(false)
  @RequireProjectPermission('ManageRoles')
  async patchProjectRoles(
    @Body(new ZodValidationPipe(projectRoleContract.patchProjectRoles.body)) body: typeof projectRoleContract.patchProjectRoles.body._type,
    @Project() project: ProjectContext,
  ) {
    return this.projectRoles.patchRoles(project.id, body)
  }

  @Get('/:projectId/roles/member-counts')
  @RequireProjectPermission('ListRoles')
  async projectRoleMemberCounts(
    @Project() project: ProjectContext,
  ) {
    return this.projectRoles.countRolesMembers(project.id)
  }

  @Delete('/:projectId/roles/:roleId')
  @HttpCode(204)
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectLocked(false)
  @RequireProjectPermission('ManageRoles')
  async deleteProjectRole(
    @Param('roleId') roleId: string,
    @Project() _project: ProjectContext,
  ): Promise<void> {
    await this.projectRoles.deleteRole(roleId)
  }
}
