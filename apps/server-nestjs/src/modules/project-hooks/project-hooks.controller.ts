import type { ProjectContext } from '../infrastructure/permission/project/project.guard.js'
import { ProjectStatusSchema } from '@cpn-console/shared'
import { Controller, HttpCode, Inject, Put, UseGuards } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { RequireProjectLocked } from '../infrastructure/permission/project/project-locked.decorator.js'
import { RequireProjectPermission } from '../infrastructure/permission/project/project-permission.decorator.js'
import { RequireProjectStatus } from '../infrastructure/permission/project/project-status.decorator.js'
import { Project } from '../infrastructure/permission/project/project.decorator.js'
import { ProjectGuard } from '../infrastructure/permission/project/project.guard.js'
import { UserGuard } from '../infrastructure/permission/user/user.guard.js'
import { ProjectService } from '../project/project.service'

@Controller('api/v1/projects')
export class ProjectHooksController {
  constructor(
    @Inject(ProjectService) private readonly projectService: ProjectService,
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
  ) {}

  @Put('/:projectId/hooks')
  @HttpCode(204)
  @UseGuards(UserGuard, ProjectGuard)
  @RequireProjectStatus(...ProjectStatusSchema.options)
  @RequireProjectLocked(false)
  @RequireProjectPermission('ReplayHooks')
  async replayHooks(
    @Project() project: ProjectContext,
  ): Promise<void> {
    const projectData = await this.projectService.get(project.id)
    await this.eventEmitter.emitAsync('project.upsert', projectData)
  }
}
