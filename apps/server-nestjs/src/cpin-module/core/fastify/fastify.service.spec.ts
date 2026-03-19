import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'

import { ConfigurationModule } from '@/cpin-module/infrastructure/configuration/configuration.module'
import { FastifyService } from './fastify.service'

describe('fastifyService', () => {
  let service: FastifyService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigurationModule],
      providers: [FastifyService],
    }).compile()

    service = module.get<FastifyService>(FastifyService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
