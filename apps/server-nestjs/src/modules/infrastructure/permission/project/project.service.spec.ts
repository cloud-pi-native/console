import type { ProjectPolicyConfig } from './project.policy'
import { ForbiddenException } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import { ProjectPermissionService } from './project.service'

function makePolicy(overrides: Partial<ProjectPolicyConfig> = {}): ProjectPolicyConfig {
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

describe('projectPermissionService > validateProjectStatus', () => {
  const service = new ProjectPermissionService()

  it('allows any status when the policy lists none', () => {
    expect(() => service.validateProjectStatus(makePolicy(), 'archived')).not.toThrow()
  })

  it('allows a listed status', () => {
    const policy = makePolicy({ projectStatuses: ['initializing', 'created', 'failed', 'warning'] })
    expect(() => service.validateProjectStatus(policy, 'created')).not.toThrow()
  })

  it('rejects an unlisted status e.g. archived', () => {
    const policy = makePolicy({ projectStatuses: ['initializing', 'created', 'failed', 'warning'] })
    expect(() => service.validateProjectStatus(policy, 'archived')).toThrow(ForbiddenException)
  })

  it('rejects a missing project status', () => {
    const policy = makePolicy({ projectStatuses: ['created'] })
    expect(() => service.validateProjectStatus(policy, undefined)).toThrow(ForbiddenException)
  })
})


describe('project archive route status policy', () => {
  it('requires statuses initializing/created/failed/warning and excludes archived', async () => {
    const { ProjectController } = await import('../../../project/project.controller')
    const { PROJECT_STATUS_KEY } = await import('./project-status.decorator')
    const statuses = Reflect.getMetadata(PROJECT_STATUS_KEY, ProjectController.prototype.archive)
    expect(statuses).toEqual(['initializing', 'created', 'failed', 'warning'])
    expect(statuses).not.toContain('archived')
  })
})
