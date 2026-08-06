import type { TestingModule } from '@nestjs/testing'
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
import { makeZoneWithDetails } from '../src/modules/vault/vault-testing.utils'
import { VaultModule } from '../src/modules/vault/vault.module'
import { VaultService } from '../src/modules/vault/vault.service'
import { getDotenvPaths } from '../src/utils/dotenv.utils'
import { VAULT_PROVISION_TIMEOUT } from './e2e-timeout'

const canRunZoneE2E = Boolean(process.env.E2E)

const describeWithZone = describe.runIf(canRunZoneE2E)

describeWithZone('Zone lifecycle (e2e)', () => {
  let moduleRef: TestingModule
  let eventEmitter: EventEmitter2
  let vaultService: VaultService
  let vaultClient: VaultClientService
  let prisma: PrismaService

  let zoneId: string
  let zoneSlug: string

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [VaultModule, ConfigModule.forRoot({ envFilePath: getDotenvPaths(), isGlobal: true, load: [baseConfigFactory] }), AuthModule, DatabaseModule, EventsModule, LoggerModule, PermissionModule],
    }).compile()

    await moduleRef.init()

    vaultService = moduleRef.get<VaultService>(VaultService)
    vaultClient = moduleRef.get<VaultClientService>(VaultClientService)
    prisma = moduleRef.get<PrismaService>(PrismaService)
    eventEmitter = moduleRef.get<EventEmitter2>(EventEmitter2)

    zoneId = faker.string.uuid()
    zoneSlug = faker.helpers.slugify(`test-zone-${faker.string.alphanumeric({ length: 10 }).toLowerCase()}`)
  })

  afterAll(async () => {
    if (zoneSlug) {
      await vaultService.deleteZone(zoneSlug).catch(() => {})
    }

    if (prisma) {
      await prisma.zone.deleteMany({ where: { id: zoneId } }).catch(() => {})
    }

    await moduleRef?.close()

    vi.unstubAllEnvs()
  })

  it('should provision zone secrets space in Vault (mount, policy, approle)', async () => {
    const zone = makeZoneWithDetails({ id: zoneId, slug: zoneSlug })

    await eventEmitter.emitAsync('zone.upsert', zone)

    const kvName = `zone-${zoneSlug}`
    const roleId = await vaultClient.getAuthApproleRoleRoleId(kvName)
    expect(roleId).toBeTruthy()
  }, VAULT_PROVISION_TIMEOUT)

  it('should remove zone from Vault on delete', async () => {
    const zone = makeZoneWithDetails({ id: zoneId, slug: zoneSlug })

    const kvName = `zone-${zoneSlug}`
    expect(await vaultClient.getAuthApproleRoleRoleId(kvName)).toBeTruthy()

    await eventEmitter.emitAsync('zone.delete', zone)

    await expect(vaultClient.getAuthApproleRoleRoleId(kvName)).rejects.toThrow()
  }, VAULT_PROVISION_TIMEOUT)
})
