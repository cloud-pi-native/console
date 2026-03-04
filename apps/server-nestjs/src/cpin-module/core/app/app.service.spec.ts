import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'

import { AppService } from './app.service'
import { ConfigurationModule } from '@/cpin-module/infrastructure/configuration/configuration.module'
import { FastifyService } from '../fastify/fastify.service'

describe('appService', () => {
  let service: AppService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigurationModule],
      providers: [AppService, FastifyService],
    }).compile()

    service = module.get<AppService>(AppService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
