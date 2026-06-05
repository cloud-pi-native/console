import type { EventEmitter2 as EventEmitter2Type } from '@nestjs/event-emitter'
import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { ForbiddenException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { LogService } from '../log/log.service'
import { projectSelect } from '../project/project-queries.utils'
import { makeProject } from '../project/project-testing.utils'
import { ProjectHooksService } from './project-hooks.service'

describe('projectHooksService', () => {
  let module: TestingModule
  let service: ProjectHooksService
  let prisma: DeepMockProxy<PrismaService>
  let eventEmitter: DeepMockProxy<EventEmitter2Type>
  let logs: DeepMockProxy<LogService>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()
    eventEmitter = mockDeep<EventEmitter2>({ emitAsync: vi.fn().mockResolvedValue([]) })
    logs = mockDeep<LogService>()

    module = await Test.createTestingModule({
      providers: [
        ProjectHooksService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: LogService, useValue: logs },
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
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith('project.upsert', project)
  })

  it('replayHooks loads the project and emits project.upsert', async () => {
    const project = makeProject()
    prisma.project.findFirst.mockResolvedValue(project)

    const requestId = 'request-id'
    const userId = 'user-id'

    await service.replayHooks('project-id', userId, requestId)

    expect(prisma.project.findFirst).toHaveBeenCalledWith({
      where: { id: 'project-id', status: { not: 'archived' } },
      select: projectSelect,
    })
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith('project.upsert', project)
    expect(logs.addLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'Replay hooks for Project',
      requestId,
      userId,
      projectId: project.id,
    }))
  })

  it('replayHooks rejects locked projects', async () => {
    const project = makeProject({ locked: true })
    prisma.project.findFirst.mockResolvedValue(project)

    await expect(service.replayHooks('project-id', 'user-id', 'request-id')).rejects.toThrow(ForbiddenException)

    expect(eventEmitter.emitAsync).not.toHaveBeenCalled()
    expect(logs.addLog).not.toHaveBeenCalled()
  })
})
