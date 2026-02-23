import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'

import { ServerService } from './server.service'

describe('serverService', () => {
  let service: ServerService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServerService],
    }).compile()

    service = module.get<ServerService>(ServerService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
