import type { INestApplication } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type { App } from 'supertest/types'
import { vi } from 'vitest'

import { MainModule } from './../src/main.module'
import { PrismaService } from '@/cpin-module/infrastructure/database/prisma.service'

describe('AppController (e2e)', () => {
  let app: INestApplication<App>

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        MainModule,
        {
          provide: PrismaService,
          useValue: {
            onModuleInit: vi.fn(),
            onModuleDestroy: vi.fn(),
          } satisfies Partial<PrismaService>,
        },
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  it('should be defined', () => {
    expect(app).toBeDefined()
  })
})
