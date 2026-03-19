import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'

import { ConfigurationModule } from '../configuration/configuration.module'
import { DatabaseService } from './database.service'

describe('databaseService', () => {
  let service: DatabaseService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigurationModule],
      providers: [DatabaseService],
    }).compile()

    service = module.get<DatabaseService>(DatabaseService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
