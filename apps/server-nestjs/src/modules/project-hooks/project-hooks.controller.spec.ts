import type { EventEmitter2 } from '@nestjs/event-emitter'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { ProjectService } from '../project/project.service.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ProjectHooksController } from './project-hooks.controller.js'

describe('projectHooksController', () => {
  let controller: ProjectHooksController
  let projectService: DeepMockProxy<ProjectService>
  let eventEmitter: DeepMockProxy<EventEmitter2>

  beforeEach(() => {
    projectService = mockDeep<ProjectService>()
    eventEmitter = mockDeep<EventEmitter2>()
    eventEmitter.emitAsync.mockResolvedValue([])
    controller = new ProjectHooksController(projectService as ProjectService, eventEmitter as EventEmitter2)
  })

  it('replayHooks emits project.upsert through the event system', async () => {
    const project = { id: 'project-id' }
    const projectData = { ...project, slug: 'project-slug', name: 'project-name' } as Awaited<ReturnType<ProjectService['get']>>
    projectService.get.mockResolvedValue(projectData)

    await controller.replayHooks(project as never)

    expect(projectService.get).toHaveBeenCalledWith('project-id')
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith('project.upsert', projectData)
  })
})
