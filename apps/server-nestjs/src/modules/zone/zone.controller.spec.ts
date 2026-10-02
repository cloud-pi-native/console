import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import type { TestingModule } from '@nestjs/testing'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { UserGuard } from '../infrastructure/permission/user/user.guard'
import { makeZone } from './zone-testing.utils'
import { ZoneController } from './zone.controller'
import { ZoneService } from './zone.service'
import { toZone } from './zone.utils'

describe('zoneController', () => {
  let module: TestingModule
  let controller: ZoneController
  let service: MockProxy<ZoneService>

  const zone = makeZone({ slug: 'paris', label: 'Paris' })

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

  it('serves GET list without authentication, matching the legacy public route', async () => {
    const app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    await app.init()
    service.list.mockResolvedValue([zone])

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/zones',
    })

    expect(response.statusCode).toEqual(200)
    expect(response.json()).toEqual([toZone(zone)])
    await app.close()
  })
})
