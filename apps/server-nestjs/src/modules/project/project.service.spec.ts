import type { CreateProjectBody } from '@cpn-console/shared'
import type { Mocked } from 'vitest'
import { faker } from '@faker-js/faker'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { VaultClientService } from '../vault/vault-client.service'
import { VaultService } from '../vault/vault.service'
import { ProjectDatastoreService } from './project-datastore.service'
import { ProjectService } from './project.service'
import { generateSlug } from './project.utils'

function createProjectServiceTestingModule() {
  return Test.createTestingModule({
    providers: [
      ProjectService,
      {
        provide: ProjectDatastoreService,
        useValue: {
          getProjectWithDetails: vi.fn(),
        } satisfies Partial<ProjectDatastoreService>,
      },
      {
        provide: PrismaService,
        useValue: {
          $transaction: vi.fn(),
        } satisfies Partial<PrismaService>,
      },
      {
        provide: EventEmitter2,
        useValue: {
          emitAsync: vi.fn(),
        } satisfies Partial<EventEmitter2>,
      },
      {
        provide: ConfigurationService,
        useValue: {
          appVersion: 'dev',
          projectRootDir: undefined,
        } satisfies Partial<ConfigurationService>,
      },
      {
        provide: VaultService,
        useValue: {
          listProjectSecrets: vi.fn(),
        } satisfies Partial<VaultService>,
      },
      {
        provide: VaultClientService,
        useValue: {
          read: vi.fn(),
        } satisfies Partial<VaultClientService>,
      },
    ],
  })
}

describe('projectService', () => {
  let service: ProjectService
  let prisma: Mocked<PrismaService>
  let events: Mocked<EventEmitter2>

  beforeEach(async () => {
    const moduleRef = await createProjectServiceTestingModule().compile()
    service = moduleRef.get(ProjectService)
    prisma = moduleRef.get(PrismaService)
    events = moduleRef.get(EventEmitter2)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('createProject', () => {
    const makeCreateBody = (): CreateProjectBody => ({
      name: faker.string.alphanumeric({ length: faker.number.int({ min: 2, max: 20 }) }).toLowerCase(),
      description: faker.lorem.sentence(),
      limitless: true,
      hprodCpu: faker.number.float({ min: 0, max: 10, fractionDigits: 2 }),
      hprodGpu: faker.number.float({ min: 0, max: 10, fractionDigits: 2 }),
      hprodMemory: faker.number.float({ min: 0, max: 10, fractionDigits: 2 }),
      prodCpu: faker.number.float({ min: 0, max: 10, fractionDigits: 2 }),
      prodGpu: faker.number.float({ min: 0, max: 10, fractionDigits: 2 }),
      prodMemory: faker.number.float({ min: 0, max: 10, fractionDigits: 2 }),
    })

    it('generates slug from existing slugs and emits project.upsert', async () => {
      const projectId = faker.string.uuid()
      const userId = faker.string.uuid()
      const createBody = makeCreateBody()
      const existingSlugs = [createBody.name, `${createBody.name}-1`]
      const expectedSlug = generateSlug(createBody.name, existingSlugs)

      const tx = {
        project: {
          findMany: vi.fn().mockResolvedValue(existingSlugs.map(slug => ({ slug }))),
          create: vi.fn().mockResolvedValue({ id: projectId }),
          findUnique: vi.fn(),
        },
      }
      prisma.$transaction.mockImplementation(async (cb: any) => cb(tx))

      const now = faker.date.recent()
      const everyonePerms = faker.number.bigInt({ min: 0n, max: 10_000n })
      const rolePerms = faker.number.bigInt({ min: 0n, max: 10_000n })
      const projectWithDetails = {
        id: projectId,
        name: createBody.name,
        slug: expectedSlug,
        description: createBody.description,
        status: 'created',
        locked: false,
        limitless: true,
        hprodCpu: createBody.hprodCpu,
        hprodGpu: createBody.hprodGpu,
        hprodMemory: createBody.hprodMemory,
        prodCpu: createBody.prodCpu,
        prodGpu: createBody.prodGpu,
        prodMemory: createBody.prodMemory,
        everyonePerms,
        ownerId: userId,
        createdAt: now,
        updatedAt: now,
        lastSuccessProvisionningVersion: null,
        owner: {
          id: userId,
          email: faker.internet.email(),
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          adminRoleIds: [],
          type: 'human',
          createdAt: now,
          updatedAt: now,
          lastLogin: null,
        },
        members: [],
        plugins: [],
        roles: [
          {
            id: faker.string.uuid(),
            name: faker.word.sample(),
            permissions: rolePerms,
            position: 0,
            oidcGroup: `/${expectedSlug}/console/admin`,
            type: 'system:managed',
            projectId,
          },
        ],
        repositories: [],
        environments: [],
        deployments: [],
        clusters: [],
      }
      tx.project.findUnique.mockResolvedValue(projectWithDetails)
      events.emitAsync.mockResolvedValue([])

      const result = await service.createProject(createBody, userId)

      expect(tx.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: { startsWith: createBody.name } },
          select: { slug: true },
        }),
      )
      expect(tx.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: expectedSlug,
          }),
        }),
      )
      expect(events.emitAsync).toHaveBeenCalledWith('project.upsert', projectWithDetails)
      expect(result.slug).toBe(expectedSlug)
      expect(result.roles[0]?.oidcGroup).toBe('/console/admin')
      expect(result.everyonePerms).toBe(everyonePerms.toString())
      expect(result.roles[0]?.permissions).toBe(rolePerms.toString())
    })
  })
})
