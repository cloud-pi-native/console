import type { ProjectV2 } from '@cpn-console/shared'
import type { UserContext } from '../infrastructure/auth/auth.service'
import type { ProjectContext } from '../infrastructure/permission/project/project.guard.js'
import { projectContract } from '@cpn-console/shared'
import { Body, Controller, Get, HttpCode, Inject, Logger, Post, Put, Query, UseGuards } from '@nestjs/common'
import { json2csv } from 'json-2-csv'
import { AuthUser } from '../infrastructure/auth/auth-user.decorator.js'
import { RequireProjectLocked } from '../infrastructure/permission/project/project-locked.decorator.js'
import { RequireProjectPermission } from '../infrastructure/permission/project/project-permission.decorator.js'
import { RequireProjectStatus } from '../infrastructure/permission/project/project-status.decorator.js'
import { Project } from '../infrastructure/permission/project/project.decorator.js'
import { ProjectGuard } from '../infrastructure/permission/project/project.guard.js'
import { RequireAdminPermission } from '../infrastructure/permission/user/user-admin-permission.decorator.js'
import { UserGuard } from '../infrastructure/permission/user/user.guard.js'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { ProjectService } from './project.service'
import { generateProjectV2 } from './project.utils'

@Controller('api/v1/projects')
export class ProjectController {
  private readonly logger = new Logger(ProjectController.name)

  constructor(
    @Inject(ProjectService) private readonly projectService: ProjectService,
  ) {}

  @Get('/data')
  @UseGuards(UserGuard)
  @RequireAdminPermission('Manage')
  async getData(): Promise<string> {
    return json2csv(await this.projectService.getData())
  }

  @Get('')
  @UseGuards(UserGuard)
  async list(
    @Query(new ZodValidationPipe(projectContract.listProjects.query)) query: typeof projectContract.listProjects.query._type,
    @AuthUser() user: UserContext,
  ): Promise<ProjectV2[]> {
    return (await this.projectService.list(query, user)).map(generateProjectV2)
  }

  @Post('')
  @HttpCode(201)
  @UseGuards(UserGuard)
  @RequireAdminPermission('ManageProjects')
  async create(
    @Body(new ZodValidationPipe(projectContract.createProject.body)) body: typeof projectContract.createProject.body._type,
    @AuthUser() user: UserContext,
  ): Promise<ProjectV2> {
    return generateProjectV2(await this.projectService.create(body, user.userId))
  }

  @Post('-bulk')
  @HttpCode(202)
  @UseGuards(UserGuard)
  @RequireAdminPermission('Manage')
  async bulkAction(
    @Body(new ZodValidationPipe(projectContract.bulkActionProject.body)) body: typeof projectContract.bulkActionProject.body._type,
  ): Promise<void> {
    this.logger.log(`project.bulkAction requested (action=${body.action}, target=${body.projectIds === 'all' ? 'all' : `count=${body.projectIds.length}`})`)
    await this.projectService.bulkAction(body)
    this.logger.log(`project.bulkAction accepted (action=${body.action})`)
  }

  @Get('/:projectId')
  @UseGuards(UserGuard, ProjectGuard)
  @RequireAdminPermission('Manage')
  @RequireProjectPermission('ListMembers')
  async get(
    @Project() project: ProjectContext,
  ): Promise<ProjectV2> {
    return generateProjectV2(await this.projectService.get(project.id))
  }

  @Put('/:projectId')
  @HttpCode(200)
  @UseGuards(UserGuard, ProjectGuard)
  @RequireAdminPermission('Manage')
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectPermission('Manage')
  async update(
    @Body(new ZodValidationPipe(projectContract.updateProject.body)) data: typeof projectContract.updateProject.body._type,
    @Project() project: ProjectContext,
    @AuthUser() user: UserContext,
  ): Promise<ProjectV2> {
    return generateProjectV2(await this.projectService.update(data, user, project.id))
  }

  @Get('/:projectId/secrets')
  @UseGuards(UserGuard, ProjectGuard)
  @RequireAdminPermission('Manage')
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectLocked(false)
  @RequireProjectPermission('SeeSecrets')
  async getSecrets(
    @Project() project: ProjectContext,
  ): Promise<Record<string, Record<string, string>>> {
    return this.projectService.getSecrets(project.id)
  }
}
