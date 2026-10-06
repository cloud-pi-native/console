import type { INestApplication } from '@nestjs/common'
import type { FastifyAdapterOptions, NestFastifyApplication } from '@nestjs/platform-fastify'
import type { TestingModule } from '@nestjs/testing'
import { ConfigModule } from '@nestjs/config'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { baseConfigFactory } from '../src/config/base.config'
import { AuthModule } from '../src/modules/infrastructure/auth/auth.module'
import { DatabaseModule } from '../src/modules/infrastructure/database/database.module'
import { LogModule } from '../src/modules/log/log.module'
import { SystemConfigModule } from '../src/modules/system-config/system-config.module'
import { getDotenvPaths } from '../src/utils/dotenv.utils'

const canRunCutoverE2E
  = Boolean(process.env.E2E)

const describeWithCutover = describe.runIf(canRunCutoverE2E)

class SilentFastifyAdapter extends FastifyAdapter {
  constructor(options: FastifyAdapterOptions = {}) {
    super({ ...options, logger: false })
  }
}

const cutoverRoutes = [
  { method: 'GET', path: '/api/v1/logs' },
  { method: 'GET', path: '/api/v1/system/plugins' },
  { method: 'POST', path: '/api/v1/system/plugins' },
] as const

describeWithCutover('nginx-strangler Vague 1 cutover (e2e)', () => {
  let moduleRef: TestingModule
  let app: INestApplication

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ envFilePath: getDotenvPaths(), isGlobal: true, load: [baseConfigFactory] }), LogModule, SystemConfigModule, AuthModule, DatabaseModule],
    }).compile()

    await moduleRef.init()

    app = moduleRef.createNestApplication<NestFastifyApplication>(new SilentFastifyAdapter(), { logger: false })
    await app.init()
    await app.getHttpAdapter().getInstance().ready()
  })

  afterAll(async () => {
    await app?.close()
    await moduleRef?.close()

    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it.each(cutoverRoutes)('$method $path answers 401 (route registered on server-nestjs, guard armed)', async ({ method, path }) => {
    const response = await app.inject({
      method,
      url: path,
    })

    expect(response.statusCode).toBe(401)
    expect(response.statusCode).not.toBe(404)
  })
})
