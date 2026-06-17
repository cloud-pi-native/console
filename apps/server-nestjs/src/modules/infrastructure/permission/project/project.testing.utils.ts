import type { ExecutionContext } from '@nestjs/common'
import type { HttpArgumentsHost } from '@nestjs/common/interfaces'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { ProjectContext } from './project.guard'
import type { ProjectPolicyConfig } from './project.policy'
import { mockDeep } from 'vitest-mock-extended'

export function makeExecutionContext(request: Record<string, unknown>): DeepMockProxy<ExecutionContext> {
  const ctx = mockDeep<ExecutionContext>()
  const httpArgs = mockDeep<HttpArgumentsHost>()
  httpArgs.getRequest.mockReturnValue(request)
  ctx.switchToHttp.mockReturnValue(httpArgs)
  return ctx
}

export function makeProjectContext(overrides: Partial<ProjectContext> = {}): ProjectContext {
  return {
    id: 'p1',
    slug: 'project',
    locked: false,
    status: 'created',
    projectPermissions: 6n,
    ...overrides,
  }
}

export function makeProjectPolicy(overrides: Partial<ProjectPolicyConfig> = {}): ProjectPolicyConfig {
  return {
    projectPermissions: [],
    projectStatuses: [],
    projectLocked: undefined,
    ...overrides,
  }
}
