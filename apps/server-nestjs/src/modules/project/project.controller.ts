import type { ProjectV2 } from '@cpn-console/shared'
import type { FastifyRequest } from 'fastify'
import type { UserContext } from '../infrastructure/auth/auth-user.decorator'
import type { ProjectContext } from '../infrastructure/permission/project/project.guard'
import { AdminAuthorized, projectContract } from '@cpn-console/shared'
import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, Inject, Post, Put, Query, Req, UseGuards } from '@nestjs/common'
import { json2csv } from 'json-2-csv'
import { AuthUser } from '../infrastructure/auth/auth-user.decorator'
import { RequireProjectAccess } from '../infrastructure/permission/project/project-access.decorator'
import { RequireProjectPermission } from '../infrastructure/permission/project/project-permission.decorator'
import { RequireProjectStatus } from '../infrastructure/permission/project/project-status.decorator'
import { Project } from '../infrastructure/permission/project/project.decorator'
import { ProjectGuard } from '../infrastructure/permission/project/project.guard'
import { RequireAdminPermission } from '../infrastructure/permission/user/user-admin-permission.decorator'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { ProjectService } from './project.service'
import { generateProjectV2 } from './project.utils'

@Controller('api/v1/projects')
export class ProjectController {
  constructor(
    @Inject(ProjectService) private readonly project: ProjectService,
  ) {}

  @Get('/data')
  @UseGuards(UserGuard)
  @RequireAdminPermission('Manage')
  async getData(): Promise<string> {
    return json2csv(await this.project.getData())
  }

  @Get('')
  @UseGuards(UserGuard)
  async list(
    @Query(new ZodValidationPipe(projectContract.listProjects.query)) query: typeof projectContract.listProjects.query._type,
    @AuthUser() user: UserContext,
  ): Promise<ProjectV2[]> {
    if (query.filter === 'all' && !AdminAuthorized.Manage(user.adminPermissions)) {
      throw new ForbiddenException('Seuls les admins avec les droits de visionnage des projets peuvent utiliser le filtre \'all\'')
    }
    return (await this.project.list(query, user)).map(generateProjectV2)
  }

  @Post('')
  @HttpCode(201)
  @UseGuards(UserGuard)
  @RequireAdminPermission('ManageProjects')
  async create(
    @Body(new ZodValidationPipe(projectContract.createProject.body)) body: typeof projectContract.createProject.body._type,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<ProjectV2> {
    return generateProjectV2(await this.project.create(body, user.userId, request.id))
  }

  @Get('/:projectId')
  @UseGuards(ProjectGuard)
  @RequireProjectAccess()
  async get(
    @Project() project: ProjectContext,
  ): Promise<ProjectV2> {
    return generateProjectV2(await this.project.get(project.id))
  }

  @Put('/:projectId')
  @HttpCode(200)
  @UseGuards(ProjectGuard)
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectPermission('Manage')
  async update(
    @Body(new ZodValidationPipe(projectContract.updateProject.body)) data: typeof projectContract.updateProject.body._type,
    @Project() project: ProjectContext,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<ProjectV2> {
    return generateProjectV2(await this.project.update(data, user, project.id, request.id))
  }

  @Delete('/:projectId')
  @HttpCode(204)
  @UseGuards(ProjectGuard)
  @RequireProjectPermission('Manage')
  async archive(
    @Project() project: ProjectContext,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<void> {
    return this.project.archive(project.id, user.userId, request.id)
  }
}
