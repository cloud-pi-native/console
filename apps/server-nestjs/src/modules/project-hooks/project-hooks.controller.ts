import type { ProjectContext } from '../infrastructure/permission/project/project.guard.js'
import { Controller, HttpCode, Inject, Put, UseGuards } from '@nestjs/common'
import { RequireProjectLocked } from '../infrastructure/permission/project/project-locked.decorator.js'
import { RequireProjectPermission } from '../infrastructure/permission/project/project-permission.decorator.js'
import { RequireProjectStatus } from '../infrastructure/permission/project/project-status.decorator.js'
import { Project } from '../infrastructure/permission/project/project.decorator.js'
import { ProjectGuard } from '../infrastructure/permission/project/project.guard.js'
import { UserGuard } from '../infrastructure/permission/user/user.guard.js'
import { ProjectHooksService } from './project-hooks.service'

@Controller('api/v1/projects')
export class ProjectHooksController {
  constructor(
    @Inject(ProjectHooksService) private readonly projectHooksService: ProjectHooksService,
  ) {}

  @Put('/:projectId/hooks')
  @HttpCode(204)
  @UseGuards(UserGuard, ProjectGuard)
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectLocked(false)
  @RequireProjectPermission('ReplayHooks')
  async replayHooks(
    @Project() project: ProjectContext,
  ): Promise<void> {
    await this.projectHooksService.replayHooks(project.id)
  }
}
