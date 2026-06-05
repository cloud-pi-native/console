import type { Member } from '@cpn-console/shared'
import type { ProjectContext } from '../infrastructure/auth/project.guard'
import { projectMemberContract } from '@cpn-console/shared'
import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post } from '@nestjs/common'
import { Project } from '../infrastructure/auth/project.decorator'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { ProjectMembersService } from './project-members.service'
import { generateProjectMember } from './project-members.utils'

@Controller('api/v1/projects')
export class ProjectMembersController {
  constructor(
    @Inject(ProjectMembersService) private readonly projectMembers: ProjectMembersService,
  ) {}

  @Get('/:projectId/members')
  // @UseGuards(UserGuard, ProjectContextGuard, ProjectPermissionGuard)
  // @RequireAdminPermission('Manage')
  // @RequireProjectPermission('ListMembers')
  async listMembers(
    @Project() project: ProjectContext,
  ): Promise<Member[]> {
    return (await this.projectMembers.listMembers(project.id)).map(generateProjectMember)
  }

  @Post('/:projectId/members')
  @HttpCode(201)
  // @UseGuards(UserGuard, ProjectContextGuard, ProjectStatusGuard, ProjectLockedGuard, ProjectPermissionGuard)
  // @RequireAdminPermission('Manage')
  // @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  // @RequireProjectLocked(false)
  // @RequireProjectPermission('ManageMembers')
  async addMember(
    @Body(new ZodValidationPipe(projectMemberContract.addMember.body)) body: typeof projectMemberContract.addMember.body._type,
    @Project() project: ProjectContext,
  ): Promise<Member[]> {
    return (await this.projectMembers.addMember(project.id, body)).map(generateProjectMember)
  }

  @Patch('/:projectId/members')
  @HttpCode(200)
  // @UseGuards(UserGuard, ProjectContextGuard, ProjectStatusGuard, ProjectLockedGuard, ProjectPermissionGuard)
  // @RequireAdminPermission('Manage')
  // @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  // @RequireProjectLocked(false)
  // @RequireProjectPermission('ManageMembers')
  async patchMembers(
    @Body(new ZodValidationPipe(projectMemberContract.patchMembers.body)) body: typeof projectMemberContract.patchMembers.body._type,
    @Project() project: ProjectContext,
  ): Promise<Member[]> {
    return (await this.projectMembers.patchMembers(project.id, body)).map(generateProjectMember)
  }

  @Delete('/:projectId/members/:userId')
  @HttpCode(200)
  // @UseGuards(UserGuard, ProjectContextGuard, ProjectStatusGuard, ProjectLockedGuard, ProjectPermissionGuard)
  // @RequireAdminPermission('Manage')
  // @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  // @RequireProjectLocked(false)
  // @RequireProjectPermission('ManageMembers')
  async removeMember(
    @Project() project: ProjectContext,
    @Param('userId') userId: string,
  ): Promise<Member[]> {
    return (await this.projectMembers.removeMember(project.id, userId)).map(generateProjectMember)
  }
}
