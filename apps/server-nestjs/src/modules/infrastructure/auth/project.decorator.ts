import type { ExecutionContext } from '@nestjs/common'
import type { ProjectContext } from './project.guard'
import { createParamDecorator, NotFoundException } from '@nestjs/common'

export const Project = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ProjectContext => {
    const request = ctx.switchToHttp().getRequest() as { project?: ProjectContext }
    if (!request.project) throw new NotFoundException()
    return request.project
  },
)
