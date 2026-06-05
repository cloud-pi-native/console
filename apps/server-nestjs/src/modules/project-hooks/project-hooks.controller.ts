import type { FastifyRequest } from 'fastify'
import type { UserContext } from '../infrastructure/auth/auth.service.js'
import type { ProjectContext } from '../infrastructure/permission/project/project.guard.js'
import { Controller, HttpCode, Inject, Put, Req, UseGuards } from '@nestjs/common'
import { AuthUser } from '../infrastructure/auth/auth-user.decorator.js'
import { RequireProjectLocked } from '../infrastructure/permission/project/project-locked.decorator.js'
import { RequireProjectPermission } from '../infrastructure/permission/project/project-permission.decorator.js'
import { RequireProjectStatus } from '../infrastructure/permission/project/project-status.decorator.js'
import { Project } from '../infrastructure/permission/project/project.decorator.js'
import { ProjectGuard } from '../infrastructure/permission/project/project.guard.js'
import { ProjectHooksService } from './project-hooks.service'

@Controller('api/v1/projects')
@UseGuards(ProjectGuard)
export class ProjectHooksController {
  constructor(
    @Inject(ProjectHooksService) private readonly projectHooks: ProjectHooksService,
  ) {}

  @Put('/:projectId/hooks')
  @HttpCode(204)
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
