import type { CanActivate, INestApplication } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { ADMIN_PERMS } from '@cpn-console/shared'
import { ValidationPipe } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaService } from '../../cpin-module/infrastructure/database/prisma.service'
import { SystemSettingsModule } from './system-settings.module'

describe('systemSettingsController (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  const headerUserId = 'x-test-user-id'

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SystemSettingsModule],
    })
      .overrideProvider(APP_GUARD)
      .useValue({
        canActivate: ((context) => {
          const req = context.switchToHttp().getRequest()
          const userId = req.headers[headerUserId]
          if (typeof userId === 'string') {
            req.user = { sub: userId }
          } else {
            req.user = undefined
          }
          return true
        }) satisfies CanActivate['canActivate'],
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
    const role = await prisma.adminRole.create({
      data: { name: `e2e-${randomUUID()}`, permissions: ADMIN_PERMS.LIST_SYSTEM, position: 1, oidcGroup: '' },
    })
    const userId = randomUUID()
    await prisma.user.create({
      data: {
        id: userId,
        firstName: 'Test',
        lastName: 'User',
        email: `user-${randomUUID()}@test.local`,
        type: 'human',
        adminRoleIds: [role.id],
      },
    })
    const key = `e2e-system-setting-${randomUUID()}`
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
    await prisma.adminRole.delete({ where: { id: role.id } })
  })

  it('rejects read without ListSystem permission', async () => {
    const userId = randomUUID()
    await prisma.user.create({
      data: {
        id: userId,
        firstName: 'Test',
        lastName: 'User',
        email: `user-${randomUUID()}@test.local`,
        type: 'human',
        adminRoleIds: [],
      },
    })
    await request(app.getHttpServer())
      .get('/api/v1/system/settings')
      .set(headerUserId, userId)
      .expect(403)
    await prisma.user.delete({ where: { id: userId } })
  })

  it('rejects invalid body on PUT', async () => {
    const role = await prisma.adminRole.create({
      data: { name: `e2e-${randomUUID()}`, permissions: ADMIN_PERMS.MANAGE_SYSTEM, position: 1, oidcGroup: '' },
    })
    const userId = randomUUID()
    await prisma.user.create({
      data: {
        id: userId,
        firstName: 'Test',
        lastName: 'User',
        email: `user-${randomUUID()}@test.local`,
        type: 'human',
        adminRoleIds: [role.id],
      },
    })
    await request(app.getHttpServer())
      .put('/api/v1/system/settings/foo')
      .set(headerUserId, userId)
      .send({})
      .expect(400)
    await prisma.user.delete({ where: { id: userId } })
    await prisma.adminRole.delete({ where: { id: role.id } })
  })

  it('rejects PUT when missing ManageSystem permission', async () => {
    const role = await prisma.adminRole.create({
      data: { name: `e2e-${randomUUID()}`, permissions: ADMIN_PERMS.LIST_SYSTEM, position: 1, oidcGroup: '' },
    })
    const userId = randomUUID()
    await prisma.user.create({
      data: {
        id: userId,
        firstName: 'Test',
        lastName: 'User',
        email: `user-${randomUUID()}@test.local`,
        type: 'human',
        adminRoleIds: [role.id],
      },
    })
    await request(app.getHttpServer())
      .put('/api/v1/system/settings/foo')
      .set(headerUserId, userId)
      .send({ value: 'bar' })
      .expect(403)
    await prisma.user.delete({ where: { id: userId } })
    await prisma.adminRole.delete({ where: { id: role.id } })
  })

  it('accepts valid body on PUT and upserts', async () => {
    const role = await prisma.adminRole.create({
      data: { name: `e2e-${randomUUID()}`, permissions: ADMIN_PERMS.MANAGE_SYSTEM, position: 1, oidcGroup: '' },
    })
    const userId = randomUUID()
    await prisma.user.create({
      data: {
        id: userId,
        firstName: 'Test',
        lastName: 'User',
        email: `user-${randomUUID()}@test.local`,
        type: 'human',
        adminRoleIds: [role.id],
      },
    })
    const key = `e2e-system-setting-${randomUUID()}`
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
    await prisma.adminRole.delete({ where: { id: role.id } })
  })
})
