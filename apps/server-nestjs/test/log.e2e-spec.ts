import type { TestingModule } from '@nestjs/testing'
import { faker } from '@faker-js/faker'
import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { baseConfigFactory } from '../src/config/base.config'
import { AuthModule } from '../src/modules/infrastructure/auth/auth.module'
import { DatabaseModule } from '../src/modules/infrastructure/database/database.module'
import { PrismaService } from '../src/modules/infrastructure/database/prisma.service'
import { EventsModule } from '../src/modules/infrastructure/events/events.module'
import { LoggerModule } from '../src/modules/infrastructure/logger/logger.module'
import { PermissionModule } from '../src/modules/infrastructure/permission/permission.module'
import { LogModule } from '../src/modules/log/log.module'
import { LogService } from '../src/modules/log/log.service'
import { getDotenvPaths } from '../src/utils/dotenv.utils'

const canRunLogE2E
  = Boolean(process.env.E2E)

const describeWithLog = describe.runIf(canRunLogE2E)

describeWithLog('LogService (e2e)', () => {
  let moduleRef: TestingModule
  let logService: LogService
  let prisma: PrismaService

  let ownerId: string
  let projectId: string
  let projectSlug: string
  let projectLogId: string
  let globalLogId: string

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ envFilePath: getDotenvPaths(), isGlobal: true, load: [baseConfigFactory] }), LogModule, AuthModule, DatabaseModule, EventsModule, LoggerModule, PermissionModule],
    }).compile()

    await moduleRef.init()

    logService = moduleRef.get(LogService)
    prisma = moduleRef.get(PrismaService)

    ownerId = faker.string.uuid()
    projectId = faker.string.uuid()
    projectSlug = faker.helpers.slugify(`test-project-${faker.string.uuid()}`)

    await prisma.user.create({
      data: {
        id: ownerId,
        email: faker.internet.email().toLowerCase(),
        firstName: 'Test',
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
        description: 'E2E Test Project',
        hprodCpu: 0,
        hprodGpu: 0,
        hprodMemory: 0,
        prodCpu: 0,
        prodGpu: 0,
        prodMemory: 0,
      },
    })
  })

  afterAll(async () => {
    if (prisma) {
      if (projectLogId) {
        await prisma.log.deleteMany({ where: { id: projectLogId } }).catch(() => {})
      }
      if (globalLogId) {
        await prisma.log.deleteMany({ where: { id: globalLogId } }).catch(() => {})
      }
      await prisma.project.deleteMany({ where: { id: projectId } }).catch(() => {})
      await prisma.user.deleteMany({ where: { id: ownerId } }).catch(() => {})
    }

    await moduleRef?.close()

    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('should persist logs and return clean/project-filtered results', async () => {
    const projectLog = await logService.addLog({
      action: 'project-upsert',
      userId: ownerId,
      projectId,
      requestId: faker.string.uuid(),
      data: {
        args: { slug: projectSlug },
        results: { ok: true },
        config: { hidden: true },
        cluster: { id: 'cluster-1' },
        user: { id: ownerId },
        newCreds: { token: 'secret' },
        apis: ['v1'],
        warning: ['careful'],
        totalExecutionTime: 42,
        messageResume: 'done',
      },
    })
    projectLogId = projectLog.id

    const globalLog = await logService.addLog({
      action: 'global-upsert',
      data: {
        args: { enabled: true },
        results: { ok: true },
        config: { hidden: true },
      },
    })
    globalLogId = globalLog.id

    const storedLog = await prisma.log.findUniqueOrThrow({
      where: { id: projectLog.id },
    })
    expect(storedLog.data).toMatchObject({
      args: { slug: projectSlug },
      results: { ok: true },
      warning: ['careful'],
      totalExecutionTime: 42,
      messageResume: 'done',
    })
    expect(storedLog.data).not.toHaveProperty('config')
    expect(storedLog.data).not.toHaveProperty('cluster')
    expect(storedLog.data).not.toHaveProperty('user')
    expect(storedLog.data).not.toHaveProperty('newCreds')
    expect(storedLog.data).not.toHaveProperty('apis')

    const { total: projectTotal, logs: projectLogs } = await logService.getLogs({
      offset: 0,
      limit: 10,
      projectId,
      clean: false,
    })
    expect(projectTotal).toBe(1)
    expect(projectLogs).toHaveLength(1)
    expect(projectLogs[0]).toMatchObject({
      id: projectLog.id,
      action: 'project-upsert',
      userId: ownerId,
      projectId,
    })
    expect(projectLogs[0].data).toMatchObject({
      args: { slug: projectSlug },
      results: { ok: true },
      warning: ['careful'],
    })
    expect(projectLogs[0].data).not.toHaveProperty('config')

    const { total: allTotal, logs: allLogs } = await logService.getLogs({
      offset: 0,
      limit: 50,
      projectId: undefined,
      clean: true,
    })
    expect(allTotal).toBeGreaterThan(2)

    const globalEntry = allLogs.find(log => log.id === globalLog.id)
    expect(globalEntry).toMatchObject({
      id: globalLog.id,
      action: 'global-upsert',
      userId: null,
    })
    expect(globalEntry?.data).not.toHaveProperty('args')
    expect(globalEntry?.data).not.toHaveProperty('results')
    expect(globalEntry?.data).not.toHaveProperty('config')

    const projectEntry = allLogs.find(log => log.id === projectLog.id)
    expect(projectEntry).toMatchObject({
      id: projectLog.id,
      action: 'project-upsert',
      userId: ownerId,
    })
    expect(projectEntry?.data).toMatchObject({
      warning: ['careful'],
      totalExecutionTime: 42,
      messageResume: 'done',
    })
    expect(projectEntry?.data).not.toHaveProperty('args')
    expect(projectEntry?.data).not.toHaveProperty('results')
    expect(projectEntry?.data).not.toHaveProperty('config')
  })
})
