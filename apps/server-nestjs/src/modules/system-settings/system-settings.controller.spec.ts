import type { INestApplication } from '@nestjs/common'
import { ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { PrismaService } from '../../cpin-module/infrastructure/database/prisma.service'
import { SystemSettingsModule } from './system-settings.module'

describe('systemSettingsController (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SystemSettingsModule],
    })
      .compile()

    app = moduleRef.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))
    await app.init()

    prisma = app.get(PrismaService)
  })

  afterAll(async () => {
    await app.close()
  })

  it('allows read with ListSystem permission', async () => {
    const key = `e2e-system-setting-${randomUUID()}`
    await prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: 'bar' },
      update: { value: 'bar' },
    })

    await request(app.getHttpServer())
      .get(`/api/v1/system/settings?key=${encodeURIComponent(key)}`)
      .set('x-test-admin-perms', String(ADMIN_PERMS.LIST_SYSTEM))
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual([expect.objectContaining({ key, value: 'bar' })])
      })

    await prisma.systemSetting.delete({ where: { key } })
  })

  it('rejects read without ListSystem permission', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/system/settings')
      .set('x-test-admin-perms', '0')
      .expect(403)
  })

  it('rejects invalid body on PUT', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/system/settings')
      .send({ key: 'foo' })
      .expect(400)
  })

  it('accepts valid body on PUT and upserts', async () => {
    const key = `e2e-system-setting-${randomUUID()}`
    await request(app.getHttpServer())
      .put('/api/v1/system/settings')
      .send({ key, value: 'bar' })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(expect.objectContaining({ key, value: 'bar' }))
      })

    const saved = await prisma.systemSetting.findUnique({ where: { key } })
    expect(saved).toEqual(expect.objectContaining({ key, value: 'bar' }))

    await prisma.systemSetting.delete({ where: { key } })
  })
})
