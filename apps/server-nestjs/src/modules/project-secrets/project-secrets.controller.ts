import { Controller, Get, Inject, UseGuards } from '@nestjs/common'
import { RequireProjectPermission } from '../infrastructure/permission/project/project-permission.decorator'
import { RequireProjectStatus } from '../infrastructure/permission/project/project-status.decorator'
import { Project } from '../infrastructure/permission/project/project.decorator'
import { ProjectGuard } from '../infrastructure/permission/project/project.guard'
import { ProjectSecretsService } from './project-secrets.service'

@Controller('api/v1/projects')
@UseGuards(ProjectGuard)
export class ProjectSecretsController {
  constructor(
    @Inject(ProjectSecretsService) private readonly projectSecrets: ProjectSecretsService,
  ) {}

  @Get('/:projectId/secrets')
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectPermission('SeeSecrets')
  async get(
    @Project() project: { id: string },
  ): Promise<Record<string, Record<string, string>>> {
    return this.projectSecrets.get(project.id)
  }
}
