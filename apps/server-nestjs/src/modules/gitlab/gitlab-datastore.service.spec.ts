import { Test, type TestingModule } from '@nestjs/testing'
import { GitlabDatastoreService } from './gitlab-datastore.service'
import { PrismaService } from '@/cpin-module/infrastructure/database/prisma.service'
import { mockDeep } from 'vitest-mock-extended'

const prismaMock = mockDeep<PrismaService>()

function createGitlabDatastoreServiceTestingModule() {
  return Test.createTestingModule({
    providers: [
      GitlabDatastoreService,
      { provide: PrismaService, useValue: prismaMock },
    ],
  })
}

describe('gitlabDatastoreService', () => {
  let service: GitlabDatastoreService

  beforeEach(async () => {
    const module: TestingModule = await createGitlabDatastoreServiceTestingModule().compile()
    service = module.get(GitlabDatastoreService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should get user', async () => {
    const user = { id: 'user-id' }
    prismaMock.user.findUnique.mockResolvedValue(user as any)
    await expect(service.getUser('user-id')).resolves.toEqual(user)
  })
})
