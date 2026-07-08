import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { ForbiddenException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { AppEventsService } from '../events/app-events.service'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { projectSelect } from '../project/project-queries.utils'
import { makeProject } from '../project/project-testing.utils'
import { ProjectHooksService } from './project-hooks.service'

describe('projectHooksService', () => {
  let module: TestingModule
  let service: ProjectHooksService
  let prisma: DeepMockProxy<PrismaService>
  let appEvents: DeepMockProxy<AppEventsService>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()
    appEvents = mockDeep<AppEventsService>()

    module = await Test.createTestingModule({
      providers: [
        ProjectHooksService,
        { provide: PrismaService, useValue: prisma },
        { provide: AppEventsService, useValue: appEvents },
      ],
    }).compile()

    service = module.get(ProjectHooksService)
  })

  afterEach(async () => {
    await module?.close()
  })

  it('updateProjectLocked updates the project locked flag', async () => {
    const project = makeProject({ locked: true })
    prisma.project.update.mockResolvedValue(project as any)

    await service.updateProjectLocked('project-id', true)

    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: 'project-id' },
      data: { locked: true },
      select: projectSelect,
    })
    expect(appEvents.emitProjectEvent).toHaveBeenCalledWith('project.upsert', project, { action: 'Update Project' })
  })

  it('replayHooks loads the project and emits project.upsert', async () => {
    const project = makeProject()
    prisma.project.findFirst.mockResolvedValue(project)

    const requestId = 'request-id'
    const userId = 'user-id'

    await service.replay('project-id', userId, requestId)

    expect(prisma.project.findFirst).toHaveBeenCalledWith({
      where: { id: 'project-id', status: { not: 'archived' } },
      select: projectSelect,
    })
    expect(appEvents.emitProjectEvent).toHaveBeenCalledWith('project.upsert', project, {
      action: 'Replay hooks for Project',
      userId,
      requestId,
    })
  })

  it('replayHooks rejects locked projects', async () => {
    const project = makeProject({ locked: true })
    prisma.project.findFirst.mockResolvedValue(project)

    await expect(service.replay('project-id', 'user-id', 'request-id')).rejects.toThrow(ForbiddenException)

    expect(appEvents.emitProjectEvent).not.toHaveBeenCalled()
  })
})
