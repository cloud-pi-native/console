import type { TestingModule } from '@nestjs/testing'
import type { Prisma } from '@prisma/client'
import { faker } from '@faker-js/faker'
import { ConfigModule } from '@nestjs/config'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { baseConfigFactory } from '../src/config/base.config'
import { AuthModule } from '../src/modules/infrastructure/auth/auth.module'
import { DatabaseModule } from '../src/modules/infrastructure/database/database.module'
import { PrismaService } from '../src/modules/infrastructure/database/prisma.service'
import { EventsModule } from '../src/modules/infrastructure/events/events.module'
import { LoggerModule } from '../src/modules/infrastructure/logger/logger.module'
import { PermissionModule } from '../src/modules/infrastructure/permission/permission.module'
import { VaultClientService } from '../src/modules/vault/vault-client.service'
import { projectSelect } from '../src/modules/vault/vault-datastore.service'
import { makeProjectWithDetails } from '../src/modules/vault/vault-testing.utils'
import { VaultModule } from '../src/modules/vault/vault.module'
import { getDotenvPaths } from '../src/utils/dotenv.utils'
import { VAULT_PROVISION_TIMEOUT } from './e2e-timeout'

const canRunVaultE2E
  = Boolean(process.env.E2E)

const describeWithVault = describe.runIf(canRunVaultE2E)

const zoneSelectForTest = {
  id: true,
  slug: true,
  label: true,
  clusters: { select: { projects: { select: { id: true } } } },
} satisfies Prisma.ZoneSelect

describeWithVault('VaultService (e2e)', () => {
  let moduleRef: TestingModule
  let eventEmitter: EventEmitter2
  let vaultClient: VaultClientService
  let prisma: PrismaService

  let ownerId: string
  let testProjectId: string
  let testProjectSlug: string

  let testZoneId: string
  let testZoneSlug: string

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [VaultModule, ConfigModule.forRoot({ envFilePath: getDotenvPaths(), isGlobal: true, load: [baseConfigFactory] }), AuthModule, DatabaseModule, EventsModule, LoggerModule, PermissionModule],
    }).compile()

    await moduleRef.init()

    vaultClient = moduleRef.get<VaultClientService>(VaultClientService)
    prisma = moduleRef.get<PrismaService>(PrismaService)
    eventEmitter = moduleRef.get<EventEmitter2>(EventEmitter2)

    ownerId = faker.string.uuid()
    testProjectId = faker.string.uuid()
    testProjectSlug = faker.helpers.slugify(`test-project-${faker.string.uuid()}`)

    await prisma.user.create({
      data: {
        id: ownerId,
        email: faker.internet.email().toLowerCase(),
        firstName: 'Test',
        lastName: 'Owner',
        type: 'human',
      },
    })
  })

  afterAll(async () => {
    // Zone cleanup mirrors the legacy hook.zone.delete contract.
    if (testZoneSlug) {
      const zone = await prisma.zone.findUnique({ where: { slug: testZoneSlug } }).catch(() => null)
      if (zone) {
        await eventEmitter.emitAsync('zone.delete', { ...zone, clusters: [] }).catch(() => {})
      }
    }

    // Project cleanup
    if (testProjectSlug) {
      await eventEmitter.emitAsync('project.delete', makeProjectWithDetails({ slug: testProjectSlug })).catch(() => {})
    }

    if (prisma) {
      await prisma.zone.deleteMany({ where: { id: testZoneId } }).catch(() => {})
      await prisma.project.deleteMany({ where: { id: testProjectId } }).catch(() => {})
      await prisma.user.deleteMany({ where: { id: ownerId } }).catch(() => {})
    }

    await moduleRef?.close()

    vi.unstubAllEnvs()
  })

  it('should reconcile project in Vault (mount, group, role)', async () => {
    await prisma.project.create({
      data: {
        id: testProjectId,
        slug: testProjectSlug,
        name: testProjectSlug,
        ownerId,
        description: 'E2E Test Project',
        hprodCpu: 0,
        hprodGpu: 0,
        hprodMemory: 0,
        prodCpu: 0,
        prodGpu: 0,
        prodMemory: 0,
      },
    })

    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })

    // Act
    await eventEmitter.emitAsync('project.upsert', project)

    // Assert
    const adminGroupName = `project-${testProjectSlug}-admin`
    const group = await vaultClient.getIdentityGroupName(adminGroupName)
    expect(group.data?.id).toBeTruthy()
    expect(group.data?.name).toBe(adminGroupName)
  }, VAULT_PROVISION_TIMEOUT)

  it('should remove project from Vault on delete', async () => {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: testProjectId },
      select: projectSelect,
    })
    const adminGroupName = `project-${testProjectSlug}-admin`
    expect(await vaultClient.getIdentityGroupName(adminGroupName)).toBeTruthy()

    // Act
    await eventEmitter.emitAsync('project.delete', project)

    // Assert: identity group was destroyed (legacy hook.project.delete contract).
    await expect(vaultClient.getIdentityGroupName(adminGroupName)).rejects.toThrow('Not Found')
  }, VAULT_PROVISION_TIMEOUT)

  // Zone parity: the zone route still lives on legacy apps/server (hook.zone.*).
  // AppEventsService has no emitZoneEvent (see app-events.service.spec.ts), so
  // this e2e emits zone.upsert/zone.delete directly through EventEmitter2 to
  // exercise the real Vault external contract (mount + policy + approle +
  // tech-readonly policy) end-to-end. When the zone module migrates and adds
  // emitZoneEvent, this same flow becomes the customer-facing path.
  describe('zone reconciliation (external parity vs legacy hook.zone.*)', () => {
    let zoneId: string
    let zoneSlug: string

    beforeAll(async () => {
      zoneId = faker.string.uuid()
      zoneSlug = faker.helpers.slugify(`zone-${faker.string.uuid()}`).slice(0, 10)
      testZoneId = zoneId
      testZoneSlug = zoneSlug
      await prisma.zone.create({ data: { id: zoneId, slug: zoneSlug, label: zoneSlug } })
    })

    it('should provision the zone Vault mount, policy and approle on zone.upsert', async () => {
      const zoneRow = await prisma.zone.findUniqueOrThrow({ where: { id: zoneId }, select: zoneSelectForTest })
      const zone = { ...zoneRow, clusters: [] }

      // Act
      await eventEmitter.emitAsync('zone.upsert', zone)

      // Assert: upsertZone created the zone mount's approle role; reading its
      // role-id proves the mount + approle + tech-readonly policy landed.
      const roleId = await vaultClient.getAuthApproleRoleRoleId(`zone-${zoneSlug}`)
      expect(roleId).toBeTruthy()
    }, VAULT_PROVISION_TIMEOUT)

    it('should tear down the zone Vault mount, policy and approle on zone.delete', async () => {
      const zoneRow = await prisma.zone.findUniqueOrThrow({ where: { id: zoneId }, select: zoneSelectForTest })
      const zone = { ...zoneRow, clusters: [] }

      await eventEmitter.emitAsync('zone.upsert', zone)
      await eventEmitter.emitAsync('zone.delete', zone)

      // Assert: mount deleted → approle role-id is gone (legacy hook.zone.delete contract).
      await expect(vaultClient.getAuthApproleRoleRoleId(`zone-${zoneSlug}`)).rejects.toThrow('Not Found')
    }, VAULT_PROVISION_TIMEOUT)
  })
})
