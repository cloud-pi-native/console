import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { ProjectContext, RequestWithProjectContext } from './project.guard'
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PROJECT_STATUS_KEY } from './project-status.decorator'

@Injectable()
export class ProjectStatusGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowedStatuses = this.reflector.getAllAndOverride<ProjectContext['status'][] | undefined>(
      PROJECT_STATUS_KEY,
      [context.getHandler(), context.getClass()],
    )

    if (!allowedStatuses?.length) {
      return true
    }

    const request = context.switchToHttp().getRequest<RequestWithProjectContext>()
    const project = request.project
    if (!project) throw new NotFoundException()

    if (!allowedStatuses.includes(project.status)) {
      throw new ForbiddenException()
    }

    return true
  }
}
