import type { ProjectV2 } from '@cpn-console/shared'
import type { ProjectContext } from '../infrastructure/auth/project.guard'
import type { UserContext } from '../infrastructure/auth/user.guard'
import { projectContract } from '@cpn-console/shared'
import { Body, Controller, Get, HttpCode, Inject, Post, Put, Query, UseGuards } from '@nestjs/common'
import { RequireAdminPermission } from '../infrastructure/auth/admin-permission.decorator'
import { AdminPermissionGuard } from '../infrastructure/auth/admin-permission.guard'
import { ProjectLockedGuard } from '../infrastructure/auth/project-locked.guard'
import { RequireProjectStatus } from '../infrastructure/auth/project-status.decorator'
import { ProjectStatusGuard } from '../infrastructure/auth/project-status.guard'
import { Project } from '../infrastructure/auth/project.decorator'
import { ProjectContextGuard } from '../infrastructure/auth/project.guard'
import { RequireUserType } from '../infrastructure/auth/user-type.decorator'
import { UserTypeGuard } from '../infrastructure/auth/user-type.guard'
import { User } from '../infrastructure/auth/user.decorator'
import { UserGuard } from '../infrastructure/auth/user.guard'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { ProjectService } from './project.service'

@Controller('api/v1/projects')
export class ProjectController {
  constructor(
    @Inject(ProjectService) private readonly projectService: ProjectService,
  ) {}

  @Get('/data')
  @UseGuards(UserGuard, AdminPermissionGuard)
  @RequireAdminPermission('Manage')
  async getProjectsData(
    @User() user: UserContext,
  ): Promise<string> {
    return this.projectService.getProjectsData(user.adminPermissions)
  }

  @Get('')
  @UseGuards(UserGuard)
  async listProjects(
    @Query(new ZodValidationPipe(projectContract.listProjects.query)) query: typeof projectContract.listProjects.query._type,
    @User() user: UserContext,
  ): Promise<ProjectV2[]> {
    return this.projectService.listProjects(query, user.id, user.adminPermissions)
  }

  @Post('')
  @HttpCode(201)
  @UseGuards(UserGuard, AdminPermissionGuard, UserTypeGuard)
  @RequireAdminPermission('ManageProjects')
  @RequireUserType('human')
  async createProject(
    @Body(new ZodValidationPipe(projectContract.createProject.body)) data: typeof projectContract.createProject.body._type,
    @User() user: UserContext,
  ): Promise<ProjectV2> {
    return this.projectService.createProject(data, user.id)
  }

  @Post('-bulk')
  @HttpCode(202)
  @UseGuards(UserGuard, AdminPermissionGuard)
  @RequireAdminPermission('Manage')
  async bulkActionProject(
    @Body(new ZodValidationPipe(projectContract.bulkActionProject.body)) body: typeof projectContract.bulkActionProject.body._type,
    @User() user: UserContext,
  ): Promise<null> {
    await this.projectService.bulkActionProject(body, user.id, user.adminPermissions)
    return null
  }

  @Get('/:projectId')
  @UseGuards(UserGuard, ProjectContextGuard, ProjectStatusGuard, ProjectLockedGuard)
  async getProject(
    @Project() project: ProjectContext,
    @User() user: UserContext,
  ): Promise<ProjectV2> {
    return this.projectService.getProject(project.id, user.id, user.adminPermissions)
  }

  @Get('/:projectId/secrets')
  @UseGuards(UserGuard, ProjectContextGuard, ProjectStatusGuard, ProjectLockedGuard)
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  async getProjectSecrets(
    @Project() project: ProjectContext,
    @User() user: UserContext,
  ): Promise<Record<string, Record<string, string>>> {
    return this.projectService.getProjectSecrets(project.id, user.id, user.adminPermissions)
  }

  @Put('/:projectId')
  @HttpCode(200)
  @UseGuards(UserGuard, ProjectContextGuard, ProjectStatusGuard, ProjectLockedGuard)
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  async updateProject(
    @Body(new ZodValidationPipe(projectContract.updateProject.body)) data: typeof projectContract.updateProject.body._type,
    @Project() project: ProjectContext,
    @User() user: UserContext,
  ): Promise<ProjectV2> {
    return this.projectService.updateProject(data, project.id, user.id, user.adminPermissions)
  }
}
