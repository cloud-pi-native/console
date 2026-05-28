import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { RequestWithProjectContext } from './project.guard'
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PROJECT_LOCKED_KEY } from './project-locked.decorator'

@Injectable()
export class ProjectLockedGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredLocked = this.reflector.getAllAndOverride<boolean | undefined>(
      PROJECT_LOCKED_KEY,
      [context.getHandler(), context.getClass()],
    )

    if (requiredLocked === undefined) {
      return true
    }

    const request = context.switchToHttp().getRequest<RequestWithProjectContext>()
    const project = request.project
    if (!project) throw new NotFoundException()

    if (project.locked !== requiredLocked) {
      throw new ForbiddenException()
    }

    return true
  }
}
