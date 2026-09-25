import type { TestingModule } from '@nestjs/testing'
import type { FastifyRequest } from 'fastify'
import type { UserContext } from '../infrastructure/auth/auth-user.decorator'
import type { MockProxy } from 'vitest-mock-extended'
import type { Zone } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { ADMIN_PERMISSIONS_KEY } from '../infrastructure/permission/user/user-admin-permission.decorator'
import { USER_TYPES_KEY } from '../infrastructure/permission/user/user-type.decorator'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { ZoneController } from './zone.controller'
import { ZoneService } from './zone.service'

describe('zoneController', () => {
  let module: TestingModule
  let controller: ZoneController
  let service: MockProxy<ZoneService>

  const zone = {
    id: faker.string.uuid(),
    slug: 'paris',
    label: 'Paris',
  } as Zone

  beforeEach(async () => {
    service = mock<ZoneService>()

    module = await Test.createTestingModule({
      controllers: [ZoneController],
      providers: [
        { provide: ZoneService, useValue: service },
      ],
    })
      .overrideGuard(UserGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<ZoneController>(ZoneController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  it('exposes GET list without admin permission or user-type restriction', () => {
    const handler = ZoneController.prototype.list
    expect(Reflect.getMetadata(ADMIN_PERMISSIONS_KEY, handler)).toBeUndefined()
    expect(Reflect.getMetadata(USER_TYPES_KEY, handler)).toBeUndefined()
  })

  it('guards mutations with ManageZones and user type human', () => {
    for (const handler of [ZoneController.prototype.create, ZoneController.prototype.update, ZoneController.prototype.delete]) {
      expect(Reflect.getMetadata(ADMIN_PERMISSIONS_KEY, handler)).toEqual(['ManageZones'])
      expect(Reflect.getMetadata(USER_TYPES_KEY, handler)).toEqual(['human'])
    }
  })

  it('delegates list to the service', async () => {
    service.list.mockResolvedValue([zone])

    expect(await controller.list()).toEqual([zone])
    expect(service.list).toHaveBeenCalledTimes(1)
  })

  it('delegates create with body, userId and requestId', async () => {
    const user = { userId: faker.string.uuid() } as UserContext
    const request = { id: faker.string.uuid() } as FastifyRequest
    service.create.mockResolvedValue(zone)

    expect(await controller.create(zone, user, request)).toBe(zone)
    expect(service.create).toHaveBeenCalledWith(zone, user.userId, request.id)
  })

  it('delegates update with zoneId, body, userId and requestId', async () => {
    const zoneId = faker.string.uuid()
    const user = { userId: faker.string.uuid() } as UserContext
    const request = { id: faker.string.uuid() } as FastifyRequest
    service.update.mockResolvedValue(zone)

    expect(await controller.update(zoneId, zone, user, request)).toBe(zone)
    expect(service.update).toHaveBeenCalledWith(zoneId, zone, user.userId, request.id)
  })

  it('delegates delete with zoneId, userId and requestId', async () => {
    const zoneId = faker.string.uuid()
    const user = { userId: faker.string.uuid() } as UserContext
    const request = { id: faker.string.uuid() } as FastifyRequest
    service.delete.mockResolvedValue(undefined)

    await controller.delete(zoneId, user, request)
    expect(service.delete).toHaveBeenCalledWith(zoneId, user.userId, request.id)
  })
})
