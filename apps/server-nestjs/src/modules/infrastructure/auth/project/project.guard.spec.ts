import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { ProjectContext } from './project.guard'
import { UnauthorizedException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ProjectLoaderService } from './project-loader.service'
import { ProjectGuard } from './project.guard'
import { ProjectPolicy } from './project.policy'
import { ProjectService } from './project.service'
import { makeExecutionContext, makeProjectContext, makeProjectPolicy } from './project.testing.utils'

describe('projectGuard', () => {
  let module: TestingModule
  let guard: ProjectGuard
  let projectService: DeepMockProxy<ProjectService>
  let projectPolicy: DeepMockProxy<ProjectPolicy>
  let loader: DeepMockProxy<ProjectLoaderService>

  beforeEach(async () => {
    projectService = mockDeep<ProjectService>()
    projectPolicy = mockDeep<ProjectPolicy>()
    loader = mockDeep<ProjectLoaderService>()

    module = await Test.createTestingModule({
      providers: [
        ProjectGuard,
        { provide: ProjectService, useValue: projectService },
        { provide: ProjectPolicy, useValue: projectPolicy },
        { provide: ProjectLoaderService, useValue: loader },
      ],
    }).compile()

    guard = module.get(ProjectGuard)
  })

  it('throws 401 when userId is not set on the request', async () => {
    const ctx = makeExecutionContext({})
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException)
  })

  it('loads project and validates', async () => {
    const project: ProjectContext = makeProjectContext({})
    const policy = makeProjectPolicy({ projectPermissions: ['Manage'] })
    projectPolicy.build.mockReturnValue(policy)
    loader.load.mockResolvedValue(project)
    const request = { userId: 'member1', adminPermissions: 0n, params: { projectId: 'p1' } }
    const ctx = makeExecutionContext(request)

    const result = await guard.canActivate(ctx)

    expect(result).toBe(true)
    expect(loader.load).toHaveBeenCalledWith(request, 'member1', expect.anything())
  })
})
