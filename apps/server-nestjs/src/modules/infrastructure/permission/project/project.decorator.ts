import type { ExecutionContext } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import type { ProjectContext } from './project.guard.js'
import { createParamDecorator } from '@nestjs/common'

export const Project = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): ProjectContext => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest & { project?: ProjectContext }>()
    if (!request.project) {
      throw new Error('Project context is missing from the request')
    }
    return request.project
  },
)
