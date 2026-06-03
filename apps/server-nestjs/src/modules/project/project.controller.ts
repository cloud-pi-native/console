import type { Member, ProjectV2 } from '@cpn-console/shared'
import type { ProjectContext } from '../infrastructure/auth/project.guard'
import type { UserContext } from '../infrastructure/auth/user.guard'
import { projectContract, projectMemberContract } from '@cpn-console/shared'
import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common'
import { RequireAdminPermission } from '../infrastructure/auth/admin-permission.decorator'
import { AdminPermissionGuard } from '../infrastructure/auth/admin-permission.guard'
import { RequireProjectLocked } from '../infrastructure/auth/project-locked.decorator'
import { ProjectLockedGuard } from '../infrastructure/auth/project-locked.guard'
import { RequireProjectPermission } from '../infrastructure/auth/project-permission.decorator'
import { ProjectPermissionGuard } from '../infrastructure/auth/project-permission.guard'
import { RequireProjectStatus } from '../infrastructure/auth/project-status.decorator'
import { ProjectStatusGuard } from '../infrastructure/auth/project-status.guard'
import { Project } from '../infrastructure/auth/project.decorator'
import { ProjectContextGuard } from '../infrastructure/auth/project.guard'
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
  async getProjectsData(): Promise<string> {
    return this.projectService.getProjectsData()
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
  @UseGuards(UserGuard, AdminPermissionGuard)
  @RequireAdminPermission('ManageProjects')
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
  ): Promise<null> {
    await this.projectService.bulkActionProject(body)
    return null
  }

  @Get('/:projectId')
  @UseGuards(UserGuard, ProjectContextGuard, ProjectPermissionGuard)
  @RequireAdminPermission('Manage')
  @RequireProjectPermission('ListMembers')
  async getProject(
    @Project() project: ProjectContext,
  ): Promise<ProjectV2> {
    return this.projectService.getProject(project)
  }

  @Get('/:projectId/secrets')
  @UseGuards(UserGuard, ProjectContextGuard, ProjectStatusGuard, ProjectLockedGuard, ProjectPermissionGuard)
  @RequireAdminPermission('Manage')
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectPermission('SeeSecrets')
  async getProjectSecrets(
    @Project() project: ProjectContext,
  ): Promise<Record<string, Record<string, string>>> {
    return this.projectService.getProjectSecrets(project.id)
  }

  @Put('/:projectId')
  @HttpCode(200)
  @UseGuards(UserGuard, ProjectContextGuard, ProjectStatusGuard, ProjectPermissionGuard)
  @RequireAdminPermission('Manage')
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectPermission('Manage')
  async updateProject(
    @Body(new ZodValidationPipe(projectContract.updateProject.body)) data: typeof projectContract.updateProject.body._type,
    @Project() project: ProjectContext,
    @User() user: UserContext,
  ): Promise<ProjectV2> {
    return this.projectService.updateProject(data, project, user.id, user.adminPermissions)
  }

  @Get('/:projectId/members')
  @UseGuards(UserGuard, ProjectContextGuard, ProjectPermissionGuard)
  @RequireAdminPermission('Manage')
  @RequireProjectPermission('ListMembers')
  async listMembers(
    @Project() project: ProjectContext,
  ): Promise<Member[]> {
    return this.projectService.listMembers(project.id)
  }

  @Post('/:projectId/members')
  @HttpCode(201)
  @UseGuards(UserGuard, ProjectContextGuard, ProjectStatusGuard, ProjectLockedGuard, ProjectPermissionGuard)
  @RequireAdminPermission('Manage')
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectLocked(false)
  @RequireProjectPermission('ManageMembers')
  async addMember(
    @Body(new ZodValidationPipe(projectMemberContract.addMember.body)) body: typeof projectMemberContract.addMember.body._type,
    @Project() project: ProjectContext,
  ): Promise<Member[]> {
    return this.projectService.addMember(project.id, body)
  }

  @Patch('/:projectId/members')
  @HttpCode(200)
  @UseGuards(UserGuard, ProjectContextGuard, ProjectStatusGuard, ProjectLockedGuard, ProjectPermissionGuard)
  @RequireAdminPermission('Manage')
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectLocked(false)
  @RequireProjectPermission('ManageMembers')
  async patchMembers(
    @Body(new ZodValidationPipe(projectMemberContract.patchMembers.body)) body: typeof projectMemberContract.patchMembers.body._type,
    @Project() project: ProjectContext,
  ): Promise<Member[]> {
    return this.projectService.patchMembers(project.id, body)
  }

  @Delete('/:projectId/members/:userId')
  @HttpCode(200)
  @UseGuards(UserGuard, ProjectContextGuard, ProjectStatusGuard, ProjectLockedGuard, ProjectPermissionGuard)
  @RequireAdminPermission('Manage')
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectLocked(false)
  @RequireProjectPermission('ManageMembers')
  async removeMember(
    @Project() project: ProjectContext,
    @Param('userId') userId: string,
  ): Promise<Member[]> {
    return this.projectService.removeMember(project.id, userId)
  }
}
