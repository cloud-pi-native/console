import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'

import { DatabaseInitializationService } from './database-initialization.service'

describe('databaseInitializationService', () => {
  let service: DatabaseInitializationService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DatabaseInitializationService],
    }).compile()

    service = module.get<DatabaseInitializationService>(
      DatabaseInitializationService,
    )
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
