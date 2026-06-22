import type { projectContract } from '@cpn-console/shared'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import { PrismaService } from '../infrastructure/database/prisma.service.js'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'
import { ProjectHooksService } from '../project-hooks/project-hooks.service.js'
import { ProjectService } from '../project/project.service.js'

@Injectable()
export class ProjectBulkService {
  private readonly logger = new Logger(ProjectBulkService.name)

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ProjectService) private readonly projectService: ProjectService,
    @Inject(ProjectHooksService) private readonly projectHooksService: ProjectHooksService,
  ) {}

  @StartActiveSpan()
  async bulkAction(data: typeof projectContract.bulkActionProject.body._type): Promise<void> {
    const span = trace.getActiveSpan()
    const projectSelector = data.projectIds
    span?.setAttribute('project.bulk.action', data.action)
    const projectIdsLog = projectSelector === 'all' ? 'all' : `count=${projectSelector.length}`
    this.logger.log(`project.bulkAction started (action=${data.action}, projectIds=${projectIdsLog})`)

    try {
      let projectIds = data.projectIds
      if (projectIds === 'all') {
        projectIds = await this.listProjectIdsNotArchived()
      }
      span?.setAttribute('project.bulk.count', projectIds.length)

      const tasks = projectIds.map((projectId) => {
        if (data.action === 'archive') {
          return () => this.projectService.archive(projectId)
        }
        if (data.action === 'lock' || data.action === 'unlock') {
          return () => this.projectHooksService.updateProjectLocked(projectId, data.action === 'lock')
        }
        if (data.action === 'replay') {
          return () => this.projectHooksService.replayHooks(projectId)
        }
        return async () => undefined
      })

      const results = await Promise.allSettled(tasks.map(fn => fn()))
      const summary = results.reduce(
        (acc, r) => {
          if (r.status === 'fulfilled') acc.fulfilled += 1
          else acc.rejected += 1
          return acc
        },
        { fulfilled: 0, rejected: 0 },
      )
      span?.setAttributes({
        'project.bulk.fulfilled': summary.fulfilled,
        'project.bulk.rejected': summary.rejected,
      })
      this.logger.log(`project.bulkAction completed (action=${data.action}, projectCount=${projectIds.length}, fulfilled=${summary.fulfilled}, rejected=${summary.rejected})`)
    } catch (error) {
      this.logger.error(
        `project.bulkAction failed (action=${data.action}, projectIds=${projectSelector === 'all' ? 'all' : `count=${projectSelector.length}`}): ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      )
      throw error
    }
  }

  private async listProjectIdsNotArchived(): Promise<string[]> {
    const projects = await this.prisma.project.findMany({
      select: { id: true },
      where: { status: { not: 'archived' } },
    })
    return projects.map(({ id }) => id)
  }
}
