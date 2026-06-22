import { Controller, Get, Inject, UseGuards } from '@nestjs/common'
import { RequireProjectPermission } from '../infrastructure/permission/project/project-permission.decorator.js'
import { RequireProjectStatus } from '../infrastructure/permission/project/project-status.decorator.js'
import { Project } from '../infrastructure/permission/project/project.decorator.js'
import { ProjectGuard } from '../infrastructure/permission/project/project.guard.js'
import { UserGuard } from '../infrastructure/permission/user/user.guard.js'
import { ProjectSecretsService } from './project-secrets.service'

@Controller('api/v1/projects')
export class ProjectSecretsController {
  constructor(
    @Inject(ProjectSecretsService) private readonly projectSecretsService: ProjectSecretsService,
  ) {}

  @Get('/:projectId/secrets')
  @UseGuards(UserGuard, ProjectGuard)
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectPermission('SeeSecrets')
  async getSecrets(
    @Project() project: { id: string },
  ): Promise<Record<string, Record<string, string>>> {
    return this.projectSecretsService.getSecrets(project.id)
  }
}
