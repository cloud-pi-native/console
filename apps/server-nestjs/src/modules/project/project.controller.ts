import type { ProjectV2 } from '@cpn-console/shared'
import type { ProjectContext } from '../infrastructure/auth/project.guard'
import type { UserContext } from '../infrastructure/auth/user.guard'
import { projectContract } from '@cpn-console/shared'
import { Body, Controller, Get, HttpCode, Inject, Post, Put, Query, UseGuards } from '@nestjs/common'
import { RequireAdminPermission } from '../infrastructure/auth/admin-permission.decorator'
import { AdminPermissionGuard } from '../infrastructure/auth/admin-permission.guard'
import { ProjectLockedGuard } from '../infrastructure/auth/project-locked.guard'
import { RequireProjectStatus } from '../infrastructure/auth/project-status.decorator'
import { ProjectStatusGuard } from '../infrastructure/auth/project-status.guard'
import { Project } from '../infrastructure/auth/project.decorator'
import { ProjectContextGuard } from '../infrastructure/auth/project.guard'
import { RequireUserType } from '../infrastructure/auth/user-type.decorator'
import { UserTypeGuard } from '../infrastructure/auth/user-type.guard'
import { User } from '../infrastructure/auth/user.decorator'
import { UserGuard } from '../infrastructure/auth/user.guard'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { ProjectService } from './project.service'

@Controller('api/v1/projects')
export class ProjectController {
  constructor(
    @Inject(ProjectService) private readonly projectService: ProjectService,
  ) {}

  @Post('')
  @HttpCode(201)
  @UseGuards(AuthenticatedGuard, AdminPermissionGuard, UserTypeGuard)
  @RequireAdminPermission('ManageProjects')
  @RequireUserType('human')
  async createProject(
    @Body(new ZodValidationPipe(projectContract.createProject.body)) data: typeof projectContract.createProject.body._type,
  ): Promise<ProjectV2> {
    return this.projectService.updateProject(data, project.id, user.id, user.adminPermissions)
  }
}
