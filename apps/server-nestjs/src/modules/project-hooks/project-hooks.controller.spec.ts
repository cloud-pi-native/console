import type { DeepMockProxy } from 'vitest-mock-extended'
import type { ProjectHooksService } from './project-hooks.service.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ProjectHooksController } from './project-hooks.controller.js'

describe('projectHooksController', () => {
  let controller: ProjectHooksController
  let projectHooksService: DeepMockProxy<ProjectHooksService>

  beforeEach(() => {
    projectHooksService = mockDeep<ProjectHooksService>()
    controller = new ProjectHooksController(projectHooksService as ProjectHooksService)
  })

  it('replayHooks delegates to the service', async () => {
    const project = { id: 'project-id' }

    await controller.replayHooks(project as never)

    expect(projectHooksService.replayHooks).toHaveBeenCalledWith('project-id')
  })
})
