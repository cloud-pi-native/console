import type { CreateRepository, UpdateRepository } from '@cpn-console/shared'
import type { Repository } from '@prisma/client'
import type { FastifyRequest } from 'fastify'
import type { UserContext } from '../infrastructure/auth/auth-user.decorator'
import type { ProjectContext } from '../infrastructure/permission/project/project.guard'
import { CreateRepositorySchema, UpdateRepositorySchema } from '@cpn-console/shared'
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common'
import { AuthUser } from '../infrastructure/auth/auth-user.decorator'
import { RequireProjectLocked } from '../infrastructure/permission/project/project-locked.decorator'
import { RequireProjectPermission } from '../infrastructure/permission/project/project-permission.decorator'
import { RequireProjectStatus } from '../infrastructure/permission/project/project-status.decorator'
import { Project } from '../infrastructure/permission/project/project.decorator'
import { ProjectGuard } from '../infrastructure/permission/project/project.guard'
import { RequireAdminPermission } from '../infrastructure/permission/user/user-admin-permission.decorator'
import { RequireUserType } from '../infrastructure/permission/user/user-type.decorator'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { RepositoryService } from './repository.service'

@Controller('api/v2/projects/:projectId/repositories')
@UseGuards(ProjectGuard)
export class RepositoryController {
  constructor(@Inject(RepositoryService) private readonly repositoryService: RepositoryService) {}

  @Get('')
  @RequireAdminPermission('ListProjects')
  @RequireProjectPermission('ListRepositories')
  list(@Project() project: ProjectContext): Promise<Repository[]> {
    return this.repositoryService.listByProjectId(project.id)
  }

  @Post('')
  @RequireProjectPermission('ManageRepositories')
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectLocked(false)
  @RequireUserType('human')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(CreateRepositorySchema)) data: CreateRepository,
    @Project() project: ProjectContext,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<Repository> {
    return this.repositoryService.createRepository(project.id, project.slug, data, user.userId, request.id)
  }

  @Put(':repositoryId')
  @RequireProjectPermission('ManageRepositories')
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectLocked(false)
  @RequireUserType('human')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('repositoryId', ParseUUIDPipe) repositoryId: string,
    @Body(new ZodValidationPipe(UpdateRepositorySchema)) data: UpdateRepository,
    @Project() project: ProjectContext,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<Repository> {
    return this.repositoryService.updateRepository(project.id, project.slug, repositoryId, data, user.userId, request.id)
  }

  @Delete(':repositoryId')
  @RequireProjectPermission('ManageRepositories')
  @RequireProjectStatus('initializing', 'created', 'failed', 'warning')
  @RequireProjectLocked(false)
  @RequireUserType('human')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('repositoryId', ParseUUIDPipe) repositoryId: string,
    @Project() project: ProjectContext,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<void> {
    return this.repositoryService.deleteRepository(project.id, repositoryId, user.userId, request.id)
  }
}
