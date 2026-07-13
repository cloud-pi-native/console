import type { PluginResults } from '../plugin/plugin.utils'
import type { ProjectWithDetails } from '../project/project-queries.utils'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { LogService } from '../log/log.service'
import { getFailedPlugins, mergePluginResults } from '../plugin/plugin.utils'
import { getProject } from '../project/project-queries.utils'
import { formatEventLogData, isPluginResults } from './app-events.utils'

export type ProjectEventName = 'project.upsert' | 'project.delete'
export type ProjectMemberEventName = 'projectMember.upsert' | 'projectMember.delete'

export interface ProjectMemberEventPayload {
  projectId: string
  userId: string
}

/** Admin-log action labels (legacy hooks wording). */
export type EventLogAction
  = | 'Create Project' | 'Update Project' | 'Delete all project resources'
    | 'Replay hooks for Project' | 'Upsert Project Role'
    | 'Create Deployment' | 'Update Deployment' | 'Delete Deployment'
    | 'Delete all project deployments'
    | 'Create Environment' | 'Update Environment' | 'Delete Environment'
    | 'Add Project Member' | 'Update Project Member' | 'Remove Project Member'

export interface EventContext {
  /** Action label persisted in the admin log. */
  action: EventLogAction
  userId?: string | null
  requestId?: string | null
}

/**
 * Single entry point to emit domain events: emits through EventEmitter2, merges the
 * `PluginResults` returned by every `capturePluginResult` listener and persists one admin
 * log per event. Emitters only provide an id and the log context.
 */
@Injectable()
export class AppEventsService {
  private readonly logger = new Logger(AppEventsService.name)

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
    @Inject(LogService) private readonly logs: LogService,
    @Inject(ConfigurationService) private readonly config: ConfigurationService,
  ) {}

  /**
   * Emits a project event and logs the merged listener results.
   *
   * Pass a project id in the general case: the project is loaded here, after the
   * emitting transaction commits, so every listener sees the same committed state.
   * Pass an already-loaded snapshot when the row no longer reflects what listeners
   * must act on (e.g. archiving renames the slug before emitting `project.delete`).
   */
  async emitProjectEvent(
    event: ProjectEventName,
    projectOrId: string | ProjectWithDetails,
    context: EventContext,
  ): Promise<PluginResults> {
    const project = typeof projectOrId === 'string'
      ? await getProject(this.prisma, projectOrId)
      : projectOrId

    if (!project) {
      this.logger.warn(`${event} skipped: project not found (projectId=${String(projectOrId)})`)
      return {}
    }

    const results = await this.emitAndLog(event, project, project.id, context)
    await this.updateProjectStatus(event, project.id, results)
    return results
  }

  async emitProjectMemberEvent(
    event: ProjectMemberEventName,
    payload: ProjectMemberEventPayload,
    context: EventContext,
  ): Promise<PluginResults> {
    return this.emitAndLog(event, payload, payload.projectId, context)
  }

  private async emitAndLog(
    event: string,
    payload: unknown,
    projectId: string,
    context: EventContext,
  ): Promise<PluginResults> {
    const start = process.hrtime.bigint()
    const responses = await this.eventEmitter.emitAsync(event, payload)
    const totalExecutionTime = Number(process.hrtime.bigint() - start) / 1_000_000

    const results = mergePluginResults(responses.filter(isPluginResults))
    this.logger.log(`${event} completed (projectId=${projectId}, services=${Object.keys(results).join(',') || 'none'})`)

    await this.logs.addLog({
      action: context.action,
      data: formatEventLogData(payload, results, totalExecutionTime),
      userId: context.userId ?? null,
      requestId: context.requestId ?? null,
      projectId,
    })

    return results
  }

  /**
   * Reflects the listeners' outcome on the project row (legacy hooks behavior):
   * any KO result marks the project `failed`; a fully successful upsert marks it
   * `created` and records the provisioning version. A successful `project.delete`
   * leaves the `archived` status set when the project was archived.
   */
  private async updateProjectStatus(
    event: ProjectEventName,
    projectId: string,
    results: PluginResults,
  ): Promise<void> {
    const failed = getFailedPlugins(results)

    if (failed.length) {
      this.logger.warn(`${event} marked project as failed (projectId=${projectId}, failed=${failed.join(',')})`)
      await this.prisma.project.update({ where: { id: projectId }, data: { status: 'failed' } })
      return
    }

    if (event === 'project.upsert') {
      await this.prisma.project.update({
        where: { id: projectId },
        data: { status: 'created', lastSuccessProvisionningVersion: this.config.appVersion },
      })
    }
  }
}
