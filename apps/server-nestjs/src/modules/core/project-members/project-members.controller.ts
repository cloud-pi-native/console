import type { Member } from '@cpn-console/shared'
import type { ProjectContext } from '../../infrastructure/permission/project/project.guard.js'
import { projectMemberContract } from '@cpn-console/shared'
import { Body, Controller, Delete, Get, HttpCode, Inject, Logger, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { RequireProjectLocked } from '../../infrastructure/permission/project/project-locked.decorator.js'
import { RequireProjectPermission } from '../../infrastructure/permission/project/project-permission.decorator.js'
import { RequireProjectStatus } from '../../infrastructure/permission/project/project-status.decorator.js'
import { Project } from '../../infrastructure/permission/project/project.decorator.js'
import { ProjectGuard } from '../../infrastructure/permission/project/project.guard.js'
import { ZodValidationPipe } from '../../infrastructure/pipe/zod-validation.pipe.js'
import { ProjectMembersService } from './project-members.service.js'
import { generateProjectMember } from './project-members.utils.js'

@Controller('api/v1/projects')
@UseGuards(ProjectGuard)
export class ProjectMembersController {
  private readonly logger = new Logger(ProjectMembersController.name)

  constructor(
    @Inject(ProjectMembersService) private readonly projectMembers: ProjectMembersService,
  ) {}

  @Get('/:projectId/members')
  @RequireProjectPermission('ListMembers')
  async listMembers(
    @Project() project: ProjectContext,
  ): Promise<Member[]> {
    return (await this.projectMembers.listMembers(project.id)).map(generateProjectMember)
  }

  @Post('/:projectId/members')
  @HttpCode(201)
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectLocked(false)
  @RequireProjectPermission('ManageMembers')
  async addMember(
    @Body(new ZodValidationPipe(projectMemberContract.addMember.body)) body: typeof projectMemberContract.addMember.body._type,
    @Project() project: ProjectContext,
  ): Promise<Member[]> {
    const members = await this.projectMembers.addMember(project.id, body)
    this.logger.log(`projectMembers.addMember completed (memberCount=${members.length})`)
    return members.map(generateProjectMember)
  }

  @Patch('/:projectId/members')
  @HttpCode(200)
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectLocked(false)
  @RequireProjectPermission('ManageMembers')
  async patchMembers(
    @Body(new ZodValidationPipe(projectMemberContract.patchMembers.body)) body: typeof projectMemberContract.patchMembers.body._type,
    @Project() project: ProjectContext,
  ): Promise<Member[]> {
    const members = await this.projectMembers.patchMembers(project.id, body)
    this.logger.log(`projectMembers.patchMembers completed (projectId=${project.id}, memberCount=${members.length})`)
    return members.map(generateProjectMember)
  }

  @Delete('/:projectId/members/:userId')
  @HttpCode(200)
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectLocked(false)
  @RequireProjectPermission('ManageMembers')
  async removeMember(
    @Project() project: ProjectContext,
    @Param('userId') userId: string,
  ): Promise<Member[]> {
    const members = await this.projectMembers.removeMember(project.id, userId)
    this.logger.log(`projectMembers.removeMember completed (projectId=${project.id}, userId=${userId}, memberCount=${members.length})`)
    return members.map(generateProjectMember)
  }
}
