import type { INestApplication } from '@nestjs/common'
import { faker } from '@faker-js/faker'
import { ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaService } from '../src/cpin-module/infrastructure/database/prisma.service'
import { SystemSettingsModule } from '../src/modules/system-settings/system-settings.module'

const canRunSystemSettingsE2E = Boolean(process.env.E2E)

const describeWithSystemSettings = describe.runIf(canRunSystemSettingsE2E)

describeWithSystemSettings('systemSettingsController (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  const headerUserId = 'x-test-user-id'

  let testUserId: string
  let testSystemSettingKey: string

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SystemSettingsModule],
    }).compile()

    app = moduleRef.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))
    await app.init()

    prisma = app.get(PrismaService)
    await prisma.$connect()

    testUserId = faker.string.uuid()
    testSystemSettingKey = faker.lorem.slug()

    await prisma.user.create({
      data: {
        id: testUserId,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email(),
        type: 'human',
        adminRoleIds: [],
      },
    })

    await prisma.systemSetting.upsert({
      where: { key: testSystemSettingKey },
      create: { key: testSystemSettingKey, value: faker.lorem.word() },
      update: { value: faker.lorem.word() },
    })
  })

  afterAll(async () => {
    await prisma.systemSetting.deleteMany({ where: { key: testSystemSettingKey } })
    await prisma.user.deleteMany({ where: { id: testUserId } })
    await prisma.$disconnect()
    await app.close()
  })

  it('read', async () => {
    const userId = faker.string.uuid()
    await prisma.user.create({
      data: {
        id: userId,
        firstName: 'Test',
        lastName: 'User',
        email: `user-${userId}@test.local`,
        type: 'human',
      },
    })
    const key = `e2e-system-setting-${faker.string.uuid()}`
    await prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: 'bar' },
      update: { value: 'bar' },
    })

    await request(app.getHttpServer())
      .get(`/api/v1/system/settings?key=${encodeURIComponent(key)}`)
      .set(headerUserId, userId)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual([expect.objectContaining({ key, value: 'bar' })])
      })

    await prisma.systemSetting.delete({ where: { key } })
    await prisma.user.delete({ where: { id: userId } })
  })

  it('upserts', async () => {
    const userId = faker.string.uuid()
    await prisma.user.create({
      data: {
        id: userId,
        firstName: 'Test',
        lastName: 'User',
        email: `user-${userId}@test.local`,
        type: 'human',
        adminRoleIds: [],
      },
    })
    const key = `e2e-system-setting-${faker.string.uuid()}`
    await request(app.getHttpServer())
      .put(`/api/v1/system/settings/${encodeURIComponent(key)}`)
      .set(headerUserId, userId)
      .send({ value: 'bar' })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(expect.objectContaining({ key, value: 'bar' }))
      })

    const saved = await prisma.systemSetting.findUnique({ where: { key } })
    expect(saved).toEqual(expect.objectContaining({ key, value: 'bar' }))

    await prisma.systemSetting.delete({ where: { key } })
    await prisma.user.delete({ where: { id: userId } })
  })
})
