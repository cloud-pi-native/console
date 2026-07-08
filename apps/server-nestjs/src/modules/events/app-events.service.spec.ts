import type { EventEmitter2 as EventEmitter2Type } from '@nestjs/event-emitter'
import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { LogService } from '../log/log.service'
import { projectSelect } from '../project/project-queries.utils'
import { makeProject } from '../project/project-testing.utils'
import { AppEventsService } from './app-events.service'

describe('appEventsService', () => {
  let module: TestingModule
  let service: AppEventsService
  let prisma: DeepMockProxy<PrismaService>
  let eventEmitter: DeepMockProxy<EventEmitter2Type>
  let logs: DeepMockProxy<LogService>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()
    eventEmitter = mockDeep<EventEmitter2>({ emitAsync: vi.fn().mockResolvedValue([]) })
    logs = mockDeep<LogService>()

    module = await Test.createTestingModule({
      providers: [
        AppEventsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: LogService, useValue: logs },
      ],
    }).compile()

    service = module.get(AppEventsService)
  })

  afterEach(async () => {
    await module?.close()
  })

  it('loads the project by id, emits and logs the merged listener results', async () => {
    const project = makeProject()
    prisma.project.findUnique.mockResolvedValue(project)
    eventEmitter.emitAsync.mockResolvedValue([
      undefined, // listener not yet migrated to capturePluginResult
      { gitlab: { status: 'OK', message: 'Up to date', executionTime: 10 } },
      { argocd: { status: 'KO', message: 'Sync failed', executionTime: 20, error: new Error('Sync failed') } },
    ])

    const results = await service.emitProjectEvent('project.upsert', project.id, {
      action: 'Create Project',
      userId: 'user-id',
      requestId: 'request-id',
    })

    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: project.id },
      select: projectSelect,
    })
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith('project.upsert', project)
    expect(results).toEqual({
      gitlab: expect.objectContaining({ status: 'OK' }),
      argocd: expect.objectContaining({ status: 'KO' }),
    })
    expect(logs.addLog).toHaveBeenCalledWith({
      action: 'Create Project',
      userId: 'user-id',
      requestId: 'request-id',
      projectId: project.id,
      data: {
        args: project,
        failed: ['argocd'],
        results: {
          gitlab: {
            status: { result: 'OK', message: 'Up to date' },
            executionTime: { main: 10 },
          },
          argocd: {
            status: { result: 'KO', message: 'Sync failed' },
            executionTime: { main: 20 },
            error: expect.stringContaining('"message":"Sync failed"'),
          },
        },
        totalExecutionTime: expect.any(Number),
        messageResume: 'Errors:\nargocd: Sync failed;',
      },
    })
  })

  it('uses a provided project snapshot without fetching it again', async () => {
    const project = makeProject()

    await service.emitProjectEvent('project.delete', project, { action: 'Delete all project resources' })

    expect(prisma.project.findUnique).not.toHaveBeenCalled()
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith('project.delete', project)
  })

  it('defaults the log userId and requestId to null', async () => {
    const project = makeProject()

    await service.emitProjectEvent('project.upsert', project, { action: 'Update Project' })

    expect(logs.addLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'Update Project',
      userId: null,
      requestId: null,
    }))
  })

  it('skips emitting and logging when the project cannot be found', async () => {
    prisma.project.findUnique.mockResolvedValue(null)

    const results = await service.emitProjectEvent('project.upsert', 'missing-id', { action: 'Update Project' })

    expect(results).toEqual({})
    expect(eventEmitter.emitAsync).not.toHaveBeenCalled()
    expect(logs.addLog).not.toHaveBeenCalled()
  })

  it('emits and logs project member events with their payload as args', async () => {
    const payload = { projectId: 'project-id', userId: 'user-id' }

    await service.emitProjectMemberEvent('projectMember.upsert', payload, { action: 'Add Project Member' })

    expect(eventEmitter.emitAsync).toHaveBeenCalledWith('projectMember.upsert', payload)
    expect(logs.addLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'Add Project Member',
      projectId: 'project-id',
      data: expect.objectContaining({ args: payload }),
    }))
  })
})
