import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import baseConfig from '../src/config/base'
import { AuthModule } from '../src/modules/infrastructure/auth/auth.module'
import { DatabaseModule } from '../src/modules/infrastructure/database/database.module'
import { PrismaService } from '../src/modules/infrastructure/database/prisma.service'
import { EventsModule } from '../src/modules/infrastructure/events/events.module'
import { LoggerModule } from '../src/modules/infrastructure/logger/logger.module'
import { PermissionModule } from '../src/modules/infrastructure/permission/permission.module'
import { ProjectPermissionModule } from '../src/modules/infrastructure/permission/project/project.module'
import { makeCreateProjectBody } from '../src/modules/project/project-testing.utils'
import { ProjectService } from '../src/modules/project/project.service'

const canRunProjectE2E = Boolean(process.env.E2E) && Boolean(process.env.DB_URL)

const describeWithProject = describe.runIf(canRunProjectE2E)

describeWithProject('ProjectService (e2e)', {}, () => {
  let moduleRef: TestingModule
  let prisma: PrismaService
  let service: ProjectService
  let eventEmitter: DeepMockProxy<EventEmitter2>

  let ownerId: string

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ envFilePath: [...(process.env.DOCKER !== 'true' ? ['.env'] : []), ...(process.env.INTEGRATION === 'true' ? ['.env.integ'] : [])], isGlobal: true, load: [baseConfig] }), AuthModule, DatabaseModule, EventsModule, LoggerModule, PermissionModule, ProjectPermissionModule],
    }).compile()

    await moduleRef.init()

    prisma = moduleRef.get(PrismaService)
    service = moduleRef.get(ProjectService)
    eventEmitter = moduleRef.get(EventEmitter2)
    vi.spyOn(eventEmitter, 'emitAsync').mockResolvedValue([])

    ownerId = faker.string.uuid()

    await prisma.user.create({
      data: {
        id: ownerId,
        email: faker.internet.email().toLowerCase(),
        firstName: 'E2E',
        lastName: 'Owner',
        type: 'human',
      },
    })
  })

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({ where: { id: ownerId } }).catch(() => {})
    }

    await moduleRef?.close()

    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('ProjectService.create', async () => {
    const createBody = makeCreateProjectBody({
      name: faker.helpers.slugify(`e2e-project-${faker.string.uuid()}`),
      description: 'Initial description',
    })
    const created = await service.create(createBody, ownerId)
    await prisma.project.deleteMany({ where: { id: created.id } }).catch(() => {})
    expect(created.id).toBeTruthy()
  })

  it('rejects ProjectService.list filter=all for non-admin', async () => {
    await expect(
      service.listProjects({ filter: 'all' }, { userId: ownerId, adminPermissions: 0n }),
    ).rejects.toThrow(ForbiddenException)
  })

  it('rejects ProjectService.get when project does not exist', async () => {
    await expect(service.get(faker.string.uuid())).rejects.toThrow(NotFoundException)
  })

  describe('with project', () => {
    let projectId: string
    let projectName: string

    beforeEach(async () => {
      eventEmitter.emitAsync.mockClear()

      const createBody = makeCreateProjectBody({
        name: faker.helpers.slugify(`e2e-project-${faker.string.uuid()}`),
        description: 'Initial description',
      })

      const created = await service.create(createBody, ownerId)
      projectId = created.id
      projectName = created.name

      eventEmitter.emitAsync.mockClear()
    })

    afterEach(async () => {
      await prisma.projectMembers.deleteMany({ where: { projectId } }).catch(() => {})
      await prisma.project.deleteMany({ where: { id: projectId } }).catch(() => {})
    })

    it('ProjectService.get', async () => {
      const fetched = await service.get(projectId)
      expect(fetched.id).toBe(projectId)
      expect(fetched.ownerId).toBe(ownerId)
    })

    it('ProjectService.list', async () => {
      const listResult = await service.listProjects({ filter: 'member' }, { userId: ownerId, adminPermissions: 0n })
      expect(listResult.some(p => p.id === projectId)).toBe(true)
    })

    it('ProjectService.getData', async () => {
      const dataExport = await service.getProjectsData()
      expect(Array.isArray(dataExport)).toBe(true)
      expect(dataExport.some(p => p.name === projectName)).toBe(true)
    })

    it('ProjectService.update', async () => {
      const updated = await service.update(
        { description: 'Updated description' },
        { userId: ownerId, adminPermissions: 0n },
        projectId,
      )
      expect(updated.description).toBe('Updated description')
    })

    it('ProjectService.archive', async () => {
      await service.archive(projectId)
      const archived = await prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: { status: true, locked: true } })
      expect(archived.status).toBe('archived')
      expect(archived.locked).toBe(true)
    })

    it('rejects ProjectService.update when project is locked', async () => {
      await prisma.project.update({ where: { id: projectId }, data: { locked: true } })
      await expect(
        service.update({ description: 'nope' }, { userId: ownerId, adminPermissions: 0n }, projectId),
      ).rejects.toThrow(ForbiddenException)
    })
  })
})
