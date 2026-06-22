import { Inject, Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { trace } from '@opentelemetry/api'
import { PrismaService } from '../infrastructure/database/prisma.service.js'
import { ProjectService } from '../project/project.service.js'

@Injectable()
export class ProjectHooksService {
  private readonly logger = new Logger(ProjectHooksService.name)

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ProjectService) private readonly projectService: ProjectService,
    @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2,
  ) {}

  async updateProjectLocked(projectId: string, locked: boolean): Promise<void> {
    await this.prisma.project.update({
      where: { id: projectId },
      data: { locked },
    })
  }

  async replayHooks(projectId: string): Promise<void> {
    const span = trace.getActiveSpan()
    span?.setAttribute('project.id', projectId)
    this.logger.log(`project.replayHooks started (projectId=${projectId})`)
    const project = await this.projectService.get(projectId)
    span?.setAttribute('project.slug', project.slug)
    await this.eventEmitter.emitAsync('project.upsert', project)
    this.logger.log(`project.replayHooks completed (projectId=${projectId})`)
  }
}
