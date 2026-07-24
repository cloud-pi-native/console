import type { TestingModule } from '@nestjs/testing'
import { faker } from '@faker-js/faker'
import { ConfigModule } from '@nestjs/config'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import baseConfig from '../src/config/base'
import { AuthModule } from '../src/modules/infrastructure/auth/auth.module'
import { DatabaseModule } from '../src/modules/infrastructure/database/database.module'
import { PrismaService } from '../src/modules/infrastructure/database/prisma.service'
import { EventsModule } from '../src/modules/infrastructure/events/events.module'
import { LoggerModule } from '../src/modules/infrastructure/logger/logger.module'
import { PermissionModule } from '../src/modules/infrastructure/permission/permission.module'
import { ProjectBulkModule } from '../src/modules/project-bulk/project-bulk.module'
import { ProjectBulkService } from '../src/modules/project-bulk/project-bulk.service'

const canRunProjectBulkE2E = Boolean(process.env.E2E) && Boolean(process.env.DB_URL)

const describeWithProjectBulk = describe.runIf(canRunProjectBulkE2E)

describeWithProjectBulk('ProjectBulkService (e2e)', {}, () => {
  let moduleRef: TestingModule
  let prisma: PrismaService
  let service: ProjectBulkService
  let eventEmitter: EventEmitter2

  let ownerId: string
  let projectId: string
  let projectSlug: string

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ envFilePath: [...(process.env.DOCKER !== 'true' ? ['.env'] : []), ...(process.env.INTEGRATION === 'true' ? ['.env.integ'] : [])], isGlobal: true, load: [baseConfig] }), AuthModule, DatabaseModule, EventsModule, LoggerModule, PermissionModule, ProjectBulkModule],
    }).compile()

    await moduleRef.init()

    prisma = moduleRef.get(PrismaService)
    service = moduleRef.get(ProjectBulkService)
    eventEmitter = moduleRef.get(EventEmitter2)
    vi.spyOn(eventEmitter, 'emitAsync').mockResolvedValue([])

    ownerId = faker.string.uuid()
    projectId = faker.string.uuid()
    projectSlug = faker.helpers.slugify(`e2e-project-${faker.string.uuid()}`)

    await prisma.user.create({
      data: {
        id: ownerId,
        email: faker.internet.email().toLowerCase(),
        firstName: 'E2E',
        lastName: 'Owner',
        type: 'human',
      },
    })

    await prisma.project.create({
      data: {
        id: projectId,
        slug: projectSlug,
        name: projectSlug,
        ownerId,
        description: 'E2E test project',
        status: 'created',
        locked: false,
        limitless: false,
        hprodCpu: 0,
        hprodGpu: 0,
        hprodMemory: 0,
        prodCpu: 0,
        prodGpu: 0,
        prodMemory: 0,
        everyonePerms: 0n,
        lastSuccessProvisionningVersion: null,
      },
    })
  })

  afterAll(async () => {
    if (prisma) {
      await prisma.project.deleteMany({ where: { id: projectId } }).catch(() => {})
      await prisma.user.deleteMany({ where: { id: ownerId } }).catch(() => {})
    }

    await moduleRef?.close()

    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('locks and unlocks projects', async () => {
    await service.bulkAction({ action: 'lock', projectIds: [projectId] })
    const locked = await prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: { locked: true } })
    expect(locked.locked).toBe(true)

    await service.bulkAction({ action: 'unlock', projectIds: [projectId] })
    const unlocked = await prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: { locked: true } })
    expect(unlocked.locked).toBe(false)
  })

  it('replays hooks for projects', async () => {
    await service.bulkAction({ action: 'replay', projectIds: [projectId] })
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      'project.upsert',
      expect.objectContaining({ id: projectId, slug: projectSlug }),
    )
  })
})
