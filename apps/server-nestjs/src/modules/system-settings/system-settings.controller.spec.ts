import type { INestApplication } from '@nestjs/common'
import { ADMIN_PERMS } from '@cpn-console/shared'
import { ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { PrismaService } from '../../cpin-module/infrastructure/database/prisma.service'
import { SystemSettingsModule } from './system-settings.module'

describe('systemSettingsController (e2e)', () => {
  let app: INestApplication
  const prismaMock = {
    systemSetting: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
  } as unknown as PrismaService

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SystemSettingsModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile()

    app = moduleRef.createNestApplication()
    app.use((req, _res, next) => {
      if (req.headers['x-test-admin'] === 'true') {
        ;(req as any).user = { adminPermissions: ADMIN_PERMS.MANAGE_SYSTEM }
      }
      next()
    })
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('rejects invalid body on PUT', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/system/settings')
      .set('x-test-admin', 'true')
      .send({ key: 'foo' })
      .expect(400)
  })

  it('rejects PUT when missing ManageSystem permission', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/system/settings')
      .send({ key: 'foo', value: 'bar' })
      .expect(403)
  })

  it('accepts valid body on PUT and upserts', async () => {
    ;(prismaMock.systemSetting.upsert as any).mockResolvedValue({ key: 'foo', value: 'bar' })
    await request(app.getHttpServer())
      .put('/api/v1/system/settings')
      .set('x-test-admin', 'true')
      .send({ key: 'foo', value: 'bar' })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(expect.objectContaining({ key: 'foo', value: 'bar' }))
      })
  })
})
