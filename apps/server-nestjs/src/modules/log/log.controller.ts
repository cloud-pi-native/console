import type { UserContext } from '../infrastructure/auth/auth.service.js'
import { AdminAuthorized, logContract } from '@cpn-console/shared'
import { Controller, ForbiddenException, Get, Inject, Query, UseGuards } from '@nestjs/common'
import { AuthUser } from '../infrastructure/auth/auth-user.decorator.js'
import { ProjectLoaderService } from '../infrastructure/permission/project/project-loader.service.js'
import { UserGuard } from '../infrastructure/permission/user/user.guard.js'
import { ZodValidationPipe } from '../infrastructure/pipe/zod-validation.pipe'
import { LogService } from './log.service'

@Controller('api/v1/logs')
@UseGuards(UserGuard)
export class LogController {
  constructor(
    @Inject(LogService) private readonly logs: LogService,
    @Inject(ProjectLoaderService) private readonly projectLoader: ProjectLoaderService,
  ) {}

  @Get('')
  async getLogs(
    @Query(new ZodValidationPipe(logContract.getLogs.query)) query: typeof logContract.getLogs.query._type,
    @AuthUser() user: UserContext,
  ) {
    const isSystemAdmin = AdminAuthorized.ListSystem(user.adminPermissions ?? 0n)
    let effectiveQuery = query

    if (!isSystemAdmin) {
      if (!query.projectId) {
        throw new ForbiddenException()
      }

      const project = await this.projectLoader.load(
        { params: { projectId: query.projectId } } as Parameters<ProjectLoaderService['load']>[0],
        user.userId,
        { includePermissions: true, includeLocked: false, includeStatus: false },
      )

      if (!project.projectPermissions) {
        throw new ForbiddenException()
      }

      effectiveQuery = { ...query, clean: true }
    }

    return this.logs.getLogs(effectiveQuery)
  }
}
