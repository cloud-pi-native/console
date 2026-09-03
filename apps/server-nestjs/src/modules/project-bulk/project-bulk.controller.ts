import type { FastifyRequest } from 'fastify'
import type { UserContext } from '../infrastructure/auth/auth-user.decorator'
import { projectContract } from '@cpn-console/shared'
import { Body, Controller, HttpCode, HttpStatus, Inject, Logger, Post, Req, UseGuards } from '@nestjs/common'
import { AuthUser } from '../infrastructure/auth/auth-user.decorator'
import { RequireAdminPermission } from '../infrastructure/permission/user/user-admin-permission.decorator'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { ProjectBulkService } from './project-bulk.service'

@Controller('api/v1/projects-bulk')
export class ProjectBulkController {
  private readonly logger = new Logger(ProjectBulkController.name)

  constructor(
    @Inject(ProjectBulkService) private readonly projectBulk: ProjectBulkService,
  ) {}

  @Post('')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(UserGuard)
  @RequireAdminPermission('Manage')
  async bulkAction(
    @Body(new ZodValidationPipe(projectContract.bulkActionProject.body)) body: typeof projectContract.bulkActionProject.body._type,
    @AuthUser() user: UserContext,
    @Req() request: FastifyRequest,
  ): Promise<void> {
    const target = body.projectIds === 'all'
      ? 'all'
      : `count=${body.projectIds.length}`

    this.logger.log(`project.bulkAction requested (action=${body.action}, target=${target})`)
    await this.projectBulk.bulkAction(body, user.userId, request.id)
    this.logger.log(`project.bulkAction accepted (action=${body.action})`)
  }
}
