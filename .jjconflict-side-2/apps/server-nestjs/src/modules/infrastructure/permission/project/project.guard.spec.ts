import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { ProjectContext } from './project.guard'
import { UnauthorizedException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { AuthService } from '../../auth/auth.service'
import { ProjectPermissionLoaderService } from './project-loader.service'
import { ProjectGuard } from './project.guard'
import { ProjectPermissionPolicy } from './project.policy'
import { ProjectPermissionService } from './project.service'
import { makeExecutionContext, makeProjectContext, makeProjectPolicy } from './project.testing.utils'

describe('projectGuard', () => {
  let module: TestingModule
  let guard: ProjectGuard
  let authService: DeepMockProxy<AuthService>
  let projectService: DeepMockProxy<ProjectPermissionService>
  let projectPolicy: DeepMockProxy<ProjectPermissionPolicy>
  let loader: DeepMockProxy<ProjectPermissionLoaderService>

  beforeEach(async () => {
    authService = mockDeep<AuthService>()
    projectService = mockDeep<ProjectPermissionService>()
    projectPolicy = mockDeep<ProjectPermissionPolicy>()
    loader = mockDeep<ProjectPermissionLoaderService>()

    module = await Test.createTestingModule({
      providers: [
        ProjectGuard,
        { provide: AuthService, useValue: authService },
        { provide: ProjectPermissionService, useValue: projectService },
        { provide: ProjectPermissionPolicy, useValue: projectPolicy },
        { provide: ProjectPermissionLoaderService, useValue: loader },
      ],
    }).compile()

    guard = module.get(ProjectGuard)
  })

  it('throws 401 when userId is not set on the request', async () => {
    projectPolicy.build.mockReturnValue(makeProjectPolicy())
    authService.authenticate.mockRejectedValue(new UnauthorizedException())
    const ctx = makeExecutionContext({})
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException)
  })

  it('loads project and validates', async () => {
    const project: ProjectContext = makeProjectContext({})
    const policy = makeProjectPolicy({ projectPermissions: ['Manage'] })
    projectPolicy.build.mockReturnValue(policy)
    authService.authenticate.mockResolvedValue({ userId: 'member1', adminPermissions: 0n })
    loader.load.mockResolvedValue(project)
    const request = { userId: 'member1', adminPermissions: 0n, params: { projectId: 'p1' } }
    const ctx = makeExecutionContext(request)

    const result = await guard.canActivate(ctx)

    expect(result).toBe(true)
    expect(loader.load).toHaveBeenCalledWith(request, 'member1', expect.anything())
  })
})
