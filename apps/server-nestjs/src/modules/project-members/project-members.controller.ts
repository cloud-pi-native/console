import type { Member } from '@cpn-console/shared'
import type { ProjectContext } from '../infrastructure/permission/project/project.guard'
import type { AddMemberInput, PatchMemberInput } from './project-members-queries.utils'
import { projectMemberContract } from '@cpn-console/shared'
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Logger, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { RequireProjectLocked } from '../infrastructure/permission/project/project-locked.decorator'
import { RequireProjectPermission } from '../infrastructure/permission/project/project-permission.decorator'
import { RequireProjectStatus } from '../infrastructure/permission/project/project-status.decorator'
import { Project } from '../infrastructure/permission/project/project.decorator'
import { ProjectGuard } from '../infrastructure/permission/project/project.guard'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { ProjectMembersService } from './project-members.service'
import { generateProjectMember } from './project-members.utils'

@Controller('api/v1/projects/:projectId/members')
@UseGuards(ProjectGuard)
export class ProjectMembersController {
  private readonly logger = new Logger(ProjectMembersController.name)

  constructor(
    @Inject(ProjectMembersService) private readonly projectMembers: ProjectMembersService,
  ) {}

  @Get()
  @RequireProjectPermission('ListMembers')
  async list(
    @Project() project: ProjectContext,
  ): Promise<Member[]> {
    return (await this.projectMembers.list(project.id)).map(generateProjectMember)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectLocked(false)
  @RequireProjectPermission('ManageMembers')
  async add(
    @Body(new ZodValidationPipe(projectMemberContract.addMember.body)) body: AddMemberInput,
    @Project() project: ProjectContext,
  ): Promise<Member[]> {
    const members = await this.projectMembers.add(project.id, body)
    this.logger.log(`projectMembers.add completed (memberCount=${members.length})`)
    return members.map(generateProjectMember)
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectLocked(false)
  @RequireProjectPermission('ManageMembers')
  async patch(
    @Body(new ZodValidationPipe(projectMemberContract.patchMembers.body)) body: PatchMemberInput[],
    @Project() project: ProjectContext,
  ): Promise<Member[]> {
    const members = await this.projectMembers.patch(project.id, body)
    this.logger.log(`projectMembers.patchMembers completed (projectId=${project.id}, memberCount=${members.length})`)
    return members.map(generateProjectMember)
  }

  @Delete('/:userId')
  @HttpCode(HttpStatus.OK)
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectLocked(false)
  @RequireProjectPermission('ManageMembers')
  async remove(
    @Project() project: ProjectContext,
    @Param('userId') userId: string,
  ): Promise<Member[]> {
    const members = await this.projectMembers.remove(project.id, userId)
    this.logger.log(`projectMembers.remove completed (projectId=${project.id}, userId=${userId}, memberCount=${members.length})`)
    return members.map(generateProjectMember)
  }
}
