import type { ExecutionContext } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import type { UserContext } from '../../auth/auth-user.decorator.js'
import { createParamDecorator } from '@nestjs/common'

export interface ProjectExecutionContext {
  projectId: string
  userId: string
  requestId: string
}

export const ProjectContext = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): ProjectExecutionContext => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest<{ Params?: { projectId?: string } }> & UserContext>()
    if (!request.params?.projectId) {
      throw new Error('Project context is missing from the request')
    }
    if (!request.userId) {
      throw new Error('User context is missing from the request')
    }
    return {
      projectId: request.params.projectId,
      userId: request.userId,
      requestId: request.id,
    }
  },
)
