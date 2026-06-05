import type { ProjectV2 } from '@cpn-console/shared'
import type { ProjectContext } from '../infrastructure/auth/project.guard'
import type { UserContext } from '../infrastructure/auth/user.guard'
import { projectContract } from '@cpn-console/shared'
import { Body, Controller, Get, HttpCode, Inject, Post, Put, Query } from '@nestjs/common'
import { json2csv } from 'json-2-csv'
import { Project } from '../infrastructure/auth/project.decorator'
import { User } from '../infrastructure/auth/user.decorator'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { ProjectService } from './project.service'
import { generateProjectV2 } from './project.utils'

@Controller('api/v1/projects')
export class ProjectController {
  constructor(
    @Inject(ProjectService) private readonly projectService: ProjectService,
  ) {}

  @Get('/data')
  // @UseGuards(UserGuard, AdminPermissionGuard)
  // @RequireAdminPermission('Manage')
  async getData(): Promise<string> {
    return json2csv(await this.projectService.getData())
  }

  @Get('')
  // @UseGuards(UserGuard)
  async list(
    @Query(new ZodValidationPipe(projectContract.listProjects.query)) query: typeof projectContract.listProjects.query._type,
    @User() user: UserContext,
  ): Promise<ProjectV2[]> {
    return (await this.projectService.list(query, user)).map(generateProjectV2)
  }

  @Post('')
  @HttpCode(201)
  // @UseGuards(UserGuard, AdminPermissionGuard)
  // @RequireAdminPermission('ManageProjects')
  async create(
    @Body(new ZodValidationPipe(projectContract.createProject.body)) body: typeof projectContract.createProject.body._type,
    @User() user: UserContext,
  ): Promise<ProjectV2> {
    return generateProjectV2(await this.projectService.create(body, user.id))
  }

  @Post('-bulk')
  @HttpCode(202)
  // @UseGuards(UserGuard, AdminPermissionGuard)
  // @RequireAdminPermission('Manage')
  async bulkAction(
    @Body(new ZodValidationPipe(projectContract.bulkActionProject.body)) body: typeof projectContract.bulkActionProject.body._type,
  ) {
    await this.projectService.bulkAction(body)
  }

  @Get('/:projectId')
  // @UseGuards(UserGuard, ProjectContextGuard, ProjectPermissionGuard)
  // @RequireAdminPermission('Manage')
  // @RequireProjectPermission('ListMembers')
  async get(
    @Project() project: ProjectContext,
  ): Promise<ProjectV2> {
    return generateProjectV2(await this.projectService.get(project.id))
  }

  @Put('/:projectId')
  @HttpCode(200)
  // @UseGuards(UserGuard, ProjectContextGuard, ProjectStatusGuard, ProjectPermissionGuard)
  // @RequireAdminPermission('Manage')
  // @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  // @RequireProjectPermission('Manage')
  async update(
    @Body(new ZodValidationPipe(projectContract.updateProject.body)) data: typeof projectContract.updateProject.body._type,
    @Project() project: ProjectContext,
    @User() user: UserContext,
  ): Promise<ProjectV2> {
    return generateProjectV2(await this.projectService.update(data, user, project.id))
  }

  @Get('/:projectId/secrets')
  // @UseGuards(UserGuard, ProjectContextGuard, ProjectStatusGuard, ProjectLockedGuard, ProjectPermissionGuard)
  // @RequireAdminPermission('Manage')
  // @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  // @RequireProjectPermission('SeeSecrets')
  async getSecrets(
    @Project() project: ProjectContext,
  ): Promise<Record<string, Record<string, string>>> {
    return this.projectService.getSecrets(project.id)
  }
}
