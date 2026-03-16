import { Test } from '@nestjs/testing'
import type { TestingModule } from '@nestjs/testing'
import { mockDeep } from 'vitest-mock-extended'
import { describe, beforeEach, it, expect } from 'vitest'

import { NexusDatastoreService } from './nexus-datastore.service'
import { PrismaService } from '@/cpin-module/infrastructure/database/prisma.service'

const prismaMock = mockDeep<PrismaService>()

function createNexusDatastoreServiceTestingModule() {
  return Test.createTestingModule({
    providers: [
      NexusDatastoreService,
      { provide: PrismaService, useValue: prismaMock },
    ],
  })
}

describe('nexusDatastoreService', () => {
  let service: NexusDatastoreService

  beforeEach(async () => {
    const module: TestingModule = await createNexusDatastoreServiceTestingModule().compile()
    service = module.get(NexusDatastoreService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should get project', async () => {
    const project = { slug: 'project-1' }
    prismaMock.project.findUnique.mockResolvedValue(project as any)
    await expect(service.getProject('project-id')).resolves.toEqual(project)
  })
})
