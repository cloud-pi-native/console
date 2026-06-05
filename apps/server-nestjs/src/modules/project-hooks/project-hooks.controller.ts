import type { FastifyRequest } from 'fastify'
import type { UserContext } from '../infrastructure/auth/auth-user.decorator'
import type { ProjectContext } from '../infrastructure/permission/project/project.guard'
import { Controller, HttpCode, HttpStatus, Inject, Put, Req, UseGuards } from '@nestjs/common'
import { AuthUser } from '../infrastructure/auth/auth-user.decorator'
import { RequireProjectLocked } from '../infrastructure/permission/project/project-locked.decorator'
import { RequireProjectPermission } from '../infrastructure/permission/project/project-permission.decorator'
import { RequireProjectStatus } from '../infrastructure/permission/project/project-status.decorator'
import { Project } from '../infrastructure/permission/project/project.decorator'
import { ProjectGuard } from '../infrastructure/permission/project/project.guard'
import { ProjectHooksService } from './project-hooks.service'

@Controller('api/v1/projects')
@UseGuards(ProjectGuard)
export class ProjectHooksController {
  constructor(
    @Inject(ProjectHooksService) private readonly projectHooks: ProjectHooksService,
  ) {}

  @Put('/:projectId/hooks')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectLocked(false)
  @RequireProjectPermission('ReplayHooks')
  async replayHooks(
    @Project() project: ProjectContext,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<void> {
    await this.projectHooks.replayHooks(project.id, user.userId, request.id)
  }
}
