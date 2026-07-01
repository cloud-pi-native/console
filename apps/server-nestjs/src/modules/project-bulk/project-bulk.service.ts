import type { projectContract } from '@cpn-console/shared'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { trace } from '@opentelemetry/api'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { StartActiveSpan } from '../infrastructure/telemetry/telemetry.decorator'
import { ProjectHooksService } from '../project-hooks/project-hooks.service'
import { ProjectService } from '../project/project.service'

@Injectable()
export class ProjectBulkService {
  private readonly logger = new Logger(ProjectBulkService.name)

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ProjectService) private readonly project: ProjectService,
    @Inject(ProjectHooksService) private readonly projectHooks: ProjectHooksService,
  ) {}

  @StartActiveSpan()
  async bulkAction(
    data: typeof projectContract.bulkActionProject.body._type,
    requestorUserId?: string,
    requestId?: string,
  ): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.bulk.action', data.action)
    const projectIdsLog = data.projectIds === 'all' ? 'all' : `count=${data.projectIds.length}`
    this.logger.log(`project.bulkAction started (action=${data.action}, projectIds=${projectIdsLog})`)

    try {
      const projectIds = await this.resolveProjectIds(data.projectIds)
      span?.setAttribute('project.bulk.count', projectIds.length)

      const results = await this.runTasks(projectIds, data.action, requestorUserId, requestId)
      const summary = this.summarizeTasks(results)

      span?.setAttributes({
        'project.bulk.fulfilled': summary.fulfilled,
        'project.bulk.rejected': summary.rejected,
      })
      this.logger.log(`project.bulkAction completed (action=${data.action}, projectCount=${projectIds.length}, fulfilled=${summary.fulfilled}, rejected=${summary.rejected})`)
    } catch (error) {
      const projectIdsLabel = data.projectIds === 'all'
        ? 'all'
        : `count=${data.projectIds.length}`
      const errorMessage = error instanceof Error ? error.message : String(error)

      this.logger.error(
        `project.bulkAction failed (action=${data.action}, projectIds=${projectIdsLabel}): ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      )
      throw error
    }
  }

  private async resolveProjectIds(projectIds: string[] | 'all'): Promise<string[]> {
    if (projectIds === 'all') {
      return this.listProjectIdsNotArchived()
    }
    return projectIds
  }

  private async runTasks(
    projectIds: string[],
    action: string,
    requestorUserId?: string,
    requestId?: string,
  ): Promise<PromiseSettledResult<void>[]> {
    const tasks = projectIds.map((projectId) => {
      if (action === 'archive') {
        return this.project.archive(projectId, requestorUserId, requestId)
      }
      if (action === 'lock' || action === 'unlock') {
        return this.projectHooks.updateProjectLocked(projectId, action === 'lock')
      }
      if (action === 'replay') {
        return this.projectHooks.replayHooks(projectId, requestorUserId, requestId)
      }
      return Promise.resolve()
    })
    return Promise.allSettled(tasks)
  }

  private summarizeTasks(results: PromiseSettledResult<void>[]): { fulfilled: number, rejected: number } {
    return results.reduce(
      (acc, r) => {
        if (r.status === 'fulfilled') acc.fulfilled += 1
        else acc.rejected += 1
        return acc
      },
      { fulfilled: 0, rejected: 0 },
    )
  }

  private async listProjectIdsNotArchived(): Promise<string[]> {
    const projects = await this.prisma.project.findMany({
      select: { id: true },
      where: { status: { not: 'archived' } },
    })
    return projects.map(({ id }) => id)
  }
}
