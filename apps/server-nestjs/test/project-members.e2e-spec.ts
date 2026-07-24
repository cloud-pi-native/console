import type { TestingModule } from '@nestjs/testing'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import baseConfig from '../src/config/base'
import { AuthModule } from '../src/modules/infrastructure/auth/auth.module'
import { DatabaseModule } from '../src/modules/infrastructure/database/database.module'
import { PrismaService } from '../src/modules/infrastructure/database/prisma.service'
import { EventsModule } from '../src/modules/infrastructure/events/events.module'
import { LoggerModule } from '../src/modules/infrastructure/logger/logger.module'
import { PermissionModule } from '../src/modules/infrastructure/permission/permission.module'
import { KeycloakClientService } from '../src/modules/keycloak/keycloak-client.service'
import { ProjectMembersModule } from '../src/modules/project-members/project-members.module'
import { ProjectMembersService } from '../src/modules/project-members/project-members.service'

const canRunProjectMembersE2E = Boolean(process.env.E2E) && Boolean(process.env.DB_URL)

const describeWithProjectMembers = describe.runIf(canRunProjectMembersE2E)

describeWithProjectMembers('ProjectMembersService (e2e)', {}, () => {
  let moduleRef: TestingModule
  let prisma: PrismaService
  let service: ProjectMembersService
  let eventEmitter: DeepMockProxy<EventEmitter2>
  let keycloakClient: DeepMockProxy<KeycloakClientService>

  let ownerId: string
  let memberId: string

  beforeAll(async () => {
    keycloakClient = mockDeep<KeycloakClientService>()
    keycloakClient.getUserByEmail.mockResolvedValue(undefined)

    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ envFilePath: [...(process.env.DOCKER !== 'true' ? ['.env'] : []), ...(process.env.INTEGRATION === 'true' ? ['.env.integ'] : [])], isGlobal: true, load: [baseConfig] }), AuthModule, DatabaseModule, EventsModule, LoggerModule, PermissionModule, ProjectMembersModule],
      providers: [
        { provide: KeycloakClientService, useValue: keycloakClient },
      ],
    }).compile()

    await moduleRef.init()

    prisma = moduleRef.get(PrismaService)
    service = moduleRef.get(ProjectMembersService)
    eventEmitter = moduleRef.get(EventEmitter2)
    vi.spyOn(eventEmitter, 'emitAsync').mockResolvedValue([])

    ownerId = faker.string.uuid()
    memberId = faker.string.uuid()

    await prisma.user.create({
      data: {
        id: ownerId,
        email: faker.internet.email().toLowerCase(),
        firstName: 'E2E',
        lastName: 'Owner',
        type: 'human',
      },
    })

    await prisma.user.create({
      data: {
        id: memberId,
        email: faker.internet.email().toLowerCase(),
        firstName: 'E2E',
        lastName: 'Member',
        type: 'human',
      },
    })
  })

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({ where: { id: memberId } }).catch(() => {})
      await prisma.user.deleteMany({ where: { id: ownerId } }).catch(() => {})
    }

    await moduleRef?.close()

    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('rejects addMember when project does not exist', async () => {
    await expect(service.add(faker.string.uuid(), { userId: memberId })).rejects.toThrow(NotFoundException)
  })

  it('rejects listMembers when project does not exist', async () => {
    await expect(service.list(faker.string.uuid())).resolves.toEqual([])
  })

  describe('with project', () => {
    let projectId: string

    beforeEach(async () => {
      eventEmitter.emitAsync.mockClear()

      projectId = faker.string.uuid()
      const projectSlug = faker.helpers.slugify(`e2e-project-${faker.string.uuid()}`)

      await prisma.project.create({
        data: {
          id: projectId,
          slug: projectSlug,
          name: projectSlug,
          ownerId,
          description: 'E2E test project',
          status: 'created',
          locked: false,
          limitless: false,
          hprodCpu: 0,
          hprodGpu: 0,
          hprodMemory: 0,
          prodCpu: 0,
          prodGpu: 0,
          prodMemory: 0,
          everyonePerms: 0n,
          lastSuccessProvisionningVersion: null,
        },
      })

      eventEmitter.emitAsync.mockClear()
    })

    afterEach(async () => {
      await prisma.projectMembers.deleteMany({ where: { projectId } }).catch(() => {})
      await prisma.project.deleteMany({ where: { id: projectId } }).catch(() => {})
    })

    it('list', async () => {
      const members = await service.list(projectId)
      expect(members).toHaveLength(0)
    })

    it('add', async () => {
      const afterAdd = await service.add(projectId, { userId: memberId })
      expect(afterAdd.some(m => m.userId === memberId)).toBe(true)
      expect(eventEmitter.emitAsync).toHaveBeenCalledWith('projectMember.upsert', { projectId, userId: memberId })
    })

    it('patch', async () => {
      await service.add(projectId, { userId: memberId })
      const roleId = faker.string.uuid()
      const afterPatch = await service.patch(projectId, [{ userId: memberId, roles: [roleId] }])
      expect(afterPatch.find(m => m.userId === memberId)?.roleIds).toContain(roleId)
    })

    it('remove', async () => {
      await service.add(projectId, { userId: memberId })
      const afterRemove = await service.remove(projectId, memberId)
      expect(afterRemove.some(m => m.userId === memberId)).toBe(false)
      expect(eventEmitter.emitAsync).toHaveBeenCalledWith('projectMember.delete', { projectId, userId: memberId })
    })

    it('rejects addMember when adding owner', async () => {
      await expect(service.add(projectId, { userId: ownerId })).rejects.toThrow(BadRequestException)
    })

    it('rejects addMember when user does not exist', async () => {
      await expect(service.add(projectId, { userId: faker.string.uuid() })).rejects.toThrow(NotFoundException)
    })
  })
})
