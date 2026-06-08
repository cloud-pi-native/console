import type { ExecutionContext } from '@nestjs/common'
import type { HttpArgumentsHost } from '@nestjs/common/interfaces'
import type { FastifyRequest } from 'fastify'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { UserContext } from './auth.service'
import { mockDeep } from 'vitest-mock-extended'

export function makeContext(headers: FastifyRequest['headers'] = {}): DeepMockProxy<ExecutionContext> {
  const context = mockDeep<ExecutionContext>()
  const httpArgumentsHost = mockDeep<HttpArgumentsHost>()
  const request = mockDeep<UserContext & FastifyRequest>()

  request.headers = headers
  httpArgumentsHost.getRequest.mockReturnValue(request)
  context.switchToHttp.mockReturnValue(httpArgumentsHost)

  return context
}
