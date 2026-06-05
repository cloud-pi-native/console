import { ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { trace } from '@opentelemetry/api'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { LogService } from '../log/log.service'
import { getProjectNotArchived, projectSelect } from '../project/project-queries.utils'

@Injectable()
export class ProjectHooksService {
  private readonly logger = new Logger(ProjectHooksService.name)

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
    @Inject(LogService) private readonly logs: LogService,
  ) {}

  async updateProjectLocked(projectId: string, locked: boolean): Promise<void> {
    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: { locked },
      select: projectSelect,
    })
    await this.eventEmitter.emitAsync('project.upsert', project)
  }

  async replayHooks(projectId: string, requestorUserId?: string, requestId?: string): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.id', projectId)
    this.logger.log(`project.replayHooks started (projectId=${projectId})`)
    const project = await getProjectNotArchived(this.prisma, projectId)
    if (!project) {
      this.logger.warn(`project.replayHooks notFound (projectId=${projectId})`)
      return
    }
    if (project.locked) {
      this.logger.warn(`project.replayHooks locked (projectId=${projectId})`)
      throw new ForbiddenException('Veuillez déverrouiller le projet pour rejouer les webhooks')
    }
    span?.setAttribute('project.slug', project.slug)
    await this.eventEmitter.emitAsync('project.upsert', project)
    await this.logs.addLog({
      action: 'Replay hooks for Project',
      data: {
        args: {
          projectId,
        },
        messageResume: `Hooks du projet rejoués: ${project.slug}`,
        results: {
          projectId: project.id,
          slug: project.slug,
        },
      },
      userId: requestorUserId,
      requestId,
      projectId: project.id,
    })
    this.logger.log(`project.replayHooks completed (projectId=${projectId})`)
  }
}
