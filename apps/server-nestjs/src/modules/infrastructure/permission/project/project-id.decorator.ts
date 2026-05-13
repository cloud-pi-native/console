import type { ExecutionContext } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { createParamDecorator } from '@nestjs/common'

export const ProjectId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest<{ Params?: { projectId?: string } }>>()
    if (!request.params?.projectId) {
      throw new Error('Project context is missing from the request')
    }
    return request.params.projectId
  },
)
