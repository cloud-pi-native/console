import type { ProjectContext } from '../infrastructure/permission/project/project.guard'
import { projectRoleContract } from '@cpn-console/shared'
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { RequireProjectLocked } from '../infrastructure/permission/project/project-locked.decorator'
import { RequireProjectPermission } from '../infrastructure/permission/project/project-permission.decorator'
import { RequireProjectStatus } from '../infrastructure/permission/project/project-status.decorator'
import { Project } from '../infrastructure/permission/project/project.decorator'
import { ProjectGuard } from '../infrastructure/permission/project/project.guard'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { ProjectRolesService } from './project-roles.service'

@Controller('api/v1/projects')
@UseGuards(ProjectGuard)
export class ProjectRolesController {
  constructor(
    @Inject(ProjectRolesService) private readonly projectRoles: ProjectRolesService,
  ) {}

  @Get('/:projectId/roles')
  @RequireProjectPermission('ListRoles')
  async list(
    @Project() project: ProjectContext,
  ) {
    return this.projectRoles.list(project.id)
  }

  @Post('/:projectId/roles')
  @HttpCode(HttpStatus.CREATED)
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectLocked(false)
  @RequireProjectPermission('ManageRoles')
  async create(
    @Body(new ZodValidationPipe(projectRoleContract.createProjectRole.body)) body: typeof projectRoleContract.createProjectRole.body._type,
    @Project() project: ProjectContext,
  ) {
    return this.projectRoles.create(project.id, body)
  }

  @Patch('/:projectId/roles')
  @HttpCode(HttpStatus.OK)
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectLocked(false)
  @RequireProjectPermission('ManageRoles')
  async update(
    @Body(new ZodValidationPipe(projectRoleContract.patchProjectRoles.body)) body: typeof projectRoleContract.patchProjectRoles.body._type,
    @Project() project: ProjectContext,
  ) {
    return this.projectRoles.update(project.id, body)
  }

  @Get('/:projectId/roles/member-counts')
  @RequireProjectPermission('ListRoles')
  async countMembers(
    @Project() project: ProjectContext,
  ) {
    return this.projectRoles.countMembers(project.id)
  }

  @Delete('/:projectId/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectLocked(false)
  @RequireProjectPermission('ManageRoles')
  async delete(
    @Param('roleId') roleId: string,
    @Project() _project: ProjectContext,
  ): Promise<void> {
    return this.projectRoles.delete(roleId)
  }
}
