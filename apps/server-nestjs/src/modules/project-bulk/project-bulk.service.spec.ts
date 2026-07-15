import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { ProjectHooksService } from '../project-hooks/project-hooks.service'
import { makeProject } from '../project/project-testing.utils'
import { ProjectService } from '../project/project.service'
import { ProjectBulkService } from './project-bulk.service'

describe('projectBulkService', () => {
  let module: TestingModule
  let service: ProjectBulkService
  let prisma: DeepMockProxy<PrismaService>
  let project: DeepMockProxy<ProjectService>
  let projectHooks: DeepMockProxy<ProjectHooksService>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()
    project = mockDeep<ProjectService>()
    projectHooks = mockDeep<ProjectHooksService>()

    module = await Test.createTestingModule({
      providers: [
        ProjectBulkService,
        { provide: PrismaService, useValue: prisma },
        { provide: ProjectService, useValue: project },
        { provide: ProjectHooksService, useValue: projectHooks },
      ],
    }).compile()

    service = module.get(ProjectBulkService)
  })

  it('processes specific project ids', async () => {
    const projectIds = [faker.string.uuid(), faker.string.uuid()]

    await service.bulkAction({ action: 'archive', projectIds }, 'user-id', 'request-id')

    expect(project.archive).toHaveBeenCalledTimes(2)
    expect(project.archive).toHaveBeenCalledWith(projectIds[0], 'user-id', 'request-id')
    expect(project.archive).toHaveBeenCalledWith(projectIds[1], 'user-id', 'request-id')
  })

  it('resolves "all" to all non-archived project ids', async () => {
    const project1Id = faker.string.uuid()
    const project2Id = faker.string.uuid()

    prisma.project.findMany.mockResolvedValue([makeProject({ id: project1Id }), makeProject({ id: project2Id })])

    await service.bulkAction({ action: 'archive', projectIds: 'all' }, 'user-id', 'request-id')

    expect(prisma.project.findMany).toHaveBeenCalledWith({
      select: { id: true },
      where: { status: { not: 'archived' } },
    })
    expect(project.archive).toHaveBeenCalledTimes(2)
  })

  it('lock action updates locked to true via project hooks', async () => {
    const projectId = faker.string.uuid()

    await service.bulkAction({ action: 'lock', projectIds: [projectId] })

    expect(projectHooks.updateProjectLocked).toHaveBeenCalledWith(projectId, true)
  })

  it('unlock action updates locked to false via project hooks', async () => {
    const projectId = faker.string.uuid()

    await service.bulkAction({ action: 'unlock', projectIds: [projectId] })

    expect(projectHooks.updateProjectLocked).toHaveBeenCalledWith(projectId, false)
  })

  it('replay action triggers hooks', async () => {
    const projectId = faker.string.uuid()

    await service.bulkAction({ action: 'replay', projectIds: [projectId] }, 'user-id', 'request-id')

    expect(projectHooks.replay).toHaveBeenCalledWith(projectId, 'user-id', 'request-id')
  })
})
