import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { describe, beforeEach, it, expect } from 'vitest'

import { FastifyService } from './fastify.service'
import { ConfigurationModule } from '@/cpin-module/infrastructure/configuration/configuration.module'

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
