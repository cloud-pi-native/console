import type { DeepMockProxy } from 'vitest-mock-extended'
import type { UserContext } from '../infrastructure/auth/auth.service.js'
import type { ProjectContext } from '../infrastructure/permission/project/project.guard.js'
import type { ProjectServicesService } from './project-services.service.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ProjectServicesController } from './project-services.controller.js'

describe('projectServicesController', () => {
  let controller: ProjectServicesController
  let projectServicesService: DeepMockProxy<ProjectServicesService>

  beforeEach(() => {
    projectServicesService = mockDeep<ProjectServicesService>()
    controller = new ProjectServicesController(projectServicesService as ProjectServicesService)
  })

  it('getServices authorizes and delegates to the service', async () => {
    projectServicesService.getProjectServices.mockResolvedValue([] as never)

    await controller.getServices(
      { permissionTarget: 'user' },
      { id: 'project-id', projectPermissions: 1n } as ProjectContext,
      { userId: 'user-id', adminPermissions: 0n } as UserContext,
    )

    expect(projectServicesService.getProjectServices).toHaveBeenCalledWith('project-id', 'user')
  })

  it('updateProjectServices delegates to the service with allowed roles', async () => {
    await controller.updateProjectServices(
      { plugin: { key: 'value' } },
      { id: 'project-id', projectPermissions: 1n, locked: false, status: 'created' } as ProjectContext,
      { userId: 'user-id', adminPermissions: 0n } as UserContext,
    )

    expect(projectServicesService.updateProjectServices).toHaveBeenCalledWith('project-id', { plugin: { key: 'value' } }, ['user'])
  })
})
