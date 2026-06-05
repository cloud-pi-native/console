import { projectContract } from '@cpn-console/shared'
import { Body, Controller, HttpCode, Inject, Logger, Post, UseGuards } from '@nestjs/common'
import { RequireAdminPermission } from '../infrastructure/permission/user/user-admin-permission.decorator.js'
import { UserGuard } from '../infrastructure/permission/user/user.guard.js'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { ProjectBulkService } from './project-bulk.service'

@Controller('api/v1/projects-bulk')
export class ProjectBulkController {
  private readonly logger = new Logger(ProjectBulkController.name)

  constructor(
    @Inject(ProjectBulkService) private readonly projectBulk: ProjectBulkService,
  ) {}

  @Post('')
  @HttpCode(202)
  @UseGuards(UserGuard)
  @RequireAdminPermission('Manage')
  async bulkAction(
    @Body(new ZodValidationPipe(projectContract.bulkActionProject.body)) body: typeof projectContract.bulkActionProject.body._type,
  ): Promise<void> {
    const target = body.projectIds === 'all'
      ? 'all'
      : `count=${body.projectIds.length}`

    this.logger.log(`project.bulkAction requested (action=${body.action}, target=${target})`)
    await this.projectBulk.bulkAction(body)
    this.logger.log(`project.bulkAction accepted (action=${body.action})`)
  }
}
