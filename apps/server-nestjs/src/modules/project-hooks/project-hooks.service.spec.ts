import type { EventEmitter2 } from '@nestjs/event-emitter'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { PrismaService } from '../infrastructure/database/prisma.service.js'
import type { ProjectService } from '../project/project.service.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ProjectHooksService } from './project-hooks.service.js'

describe('projectHooksService', () => {
  let service: ProjectHooksService
  let prisma: DeepMockProxy<PrismaService>
  let projectService: DeepMockProxy<ProjectService>
  let eventEmitter: DeepMockProxy<EventEmitter2>

  beforeEach(() => {
    prisma = mockDeep<PrismaService>()
    projectService = mockDeep<ProjectService>()
    eventEmitter = mockDeep<EventEmitter2>()
    eventEmitter.emitAsync.mockResolvedValue([])
    service = new ProjectHooksService(prisma as PrismaService, projectService as ProjectService, eventEmitter as EventEmitter2)
  })

  it('updateProjectLocked updates the project locked flag', async () => {
    await service.updateProjectLocked('project-id', true)

    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: 'project-id' },
      data: { locked: true },
    })
  })

  it('replayHooks loads the project and emits project.upsert', async () => {
    const projectData = { id: 'project-id', slug: 'project-slug' } as Awaited<ReturnType<ProjectService['get']>>
    projectService.get.mockResolvedValue(projectData)

    await service.replayHooks('project-id')

    expect(projectService.get).toHaveBeenCalledWith('project-id')
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith('project.upsert', projectData)
  })
})
