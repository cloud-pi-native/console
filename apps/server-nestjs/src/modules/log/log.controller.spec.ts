import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { ADMIN_PERMS } from '@cpn-console/shared'
import { ForbiddenException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ProjectLoaderService } from '../infrastructure/permission/project/project-loader.service'
import { makeProjectContext } from '../infrastructure/permission/project/project.testing.utils'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { LogController } from './log.controller'
import { LogService } from './log.service'

describe('logController', () => {
  let module: TestingModule
  let controller: LogController
  let logs: DeepMockProxy<LogService>
  let projectLoader: DeepMockProxy<ProjectLoaderService>

  beforeEach(async () => {
    logs = mockDeep<LogService>()
    projectLoader = mockDeep<ProjectLoaderService>()

    module = await Test.createTestingModule({
      controllers: [LogController],
      providers: [
        { provide: LogService, useValue: logs },
        { provide: ProjectLoaderService, useValue: projectLoader },
      ],
    })
      .overrideGuard(UserGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<LogController>(LogController)
  })

  it('returns logs for system admins without project lookup', async () => {
    logs.getLogs.mockResolvedValueOnce({ total: 1, logs: [] })

    const response = await controller.getLogs(
      { limit: 10, offset: 0, clean: false, projectId: undefined },
      { userId: 'user-1', adminPermissions: ADMIN_PERMS.LIST_SYSTEM, userType: 'human' },
    )

    expect(projectLoader.load).not.toHaveBeenCalled()
    expect(logs.getLogs).toHaveBeenCalledWith({ limit: 10, offset: 0, clean: false, projectId: undefined })
    expect(response).toEqual({ total: 1, logs: [] })
  })

  it('forces clean logs for project-scoped non-admin access', async () => {
    projectLoader.load.mockResolvedValueOnce(makeProjectContext({ projectPermissions: 1n }))
    logs.getLogs.mockResolvedValueOnce({ total: 1, logs: [] })

    await controller.getLogs(
      { limit: 10, offset: 0, clean: false, projectId: 'project-1' },
      { userId: 'user-1', adminPermissions: 0n, userType: 'human' },
    )

    expect(projectLoader.load).toHaveBeenCalledTimes(1)
    expect(logs.getLogs).toHaveBeenCalledWith({ limit: 10, offset: 0, clean: true, projectId: 'project-1' })
  })

  it('rejects non-admin access without projectId', async () => {
    await expect(controller.getLogs(
      { limit: 10, offset: 0, clean: false, projectId: undefined },
      { userId: 'user-1', adminPermissions: 0n, userType: 'human' },
    )).rejects.toThrow(ForbiddenException)
  })

  it('rejects non-admin access when user has no project permissions', async () => {
    projectLoader.load.mockResolvedValueOnce(makeProjectContext({ projectPermissions: 0n }))

    await expect(controller.getLogs(
      { limit: 10, offset: 0, clean: false, projectId: 'project-1' },
      { userId: 'user-1', adminPermissions: 0n, userType: 'human' },
    )).rejects.toThrow(ForbiddenException)
  })
})
