import type { ExecutionContext } from '@nestjs/common'
import type { HttpArgumentsHost } from '@nestjs/common/interfaces'
import type { Prisma } from '@prisma/client'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { makeProjectSelect } from './project-loader.utils'
import type { ProjectContext } from './project.guard'
import type { ProjectPolicyConfig } from './project.policy'
import { mockDeep } from 'vitest-mock-extended'

type RawProject = Prisma.ProjectGetPayload<{ select: ReturnType<typeof makeProjectSelect> }>

export function makeProjectRecord(overrides: Partial<RawProject> = {}): RawProject {
  return {
    id: '0b3f7e58-1e2a-4c6b-9d0e-5f6a7b8c9d01',
    slug: 'project-slug',
    status: 'created',
    locked: false,
    ownerId: 'owner-id',
    everyonePerms: 0n,
    roles: [{ id: 'role-1', permissions: 1n }],
    members: [{ userId: 'member-id', roleIds: ['role-1'] }],
    ...overrides,
  }
}

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
    adminPermissions: [],
    userTypes: [],
    projectPermissions: [],
    projectStatuses: [],
    projectLocked: undefined,
    projectAccess: false,
    ...overrides,
  }
}
