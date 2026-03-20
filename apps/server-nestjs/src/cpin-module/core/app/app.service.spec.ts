import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'

import { ConfigurationModule } from '../../infrastructure/configuration/configuration.module'
import { FastifyService } from '../fastify/fastify.service'
import { AppService } from './app.service'

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
