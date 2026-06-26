import type { TestingModule } from '@nestjs/testing'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { AdminTokenModule } from '../src/modules/admin-token/admin-token.module'
import { AdminTokenService } from '../src/modules/admin-token/admin-token.service'
import { PrismaService } from '../src/modules/infrastructure/database/prisma.service'

const canRunAdminTokenE2E = Boolean(process.env.E2E) && Boolean(process.env.DB_URL)

const describeWithAdminToken = describe.runIf(canRunAdminTokenE2E)

describeWithAdminToken('AdminTokenService (e2e)', () => {
  let moduleRef: TestingModule
  let service: AdminTokenService
  let prisma: PrismaService

  const createdTokenIds: string[] = []
  const createdBotUserIds: string[] = []

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AdminTokenModule],
    }).compile()

    await moduleRef.init()

    service = moduleRef.get(AdminTokenService)
    prisma = moduleRef.get(PrismaService)
  })

  afterAll(async () => {
    if (prisma) {
      await prisma.adminToken.deleteMany({ where: { id: { in: createdTokenIds } } }).catch(() => {})
      await prisma.user.deleteMany({ where: { id: { in: createdBotUserIds } } }).catch(() => {})
    }

    await moduleRef?.close()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('should create a bot user and issue a token with plaintext password', async () => {
    const result = await service.create({
      name: `e2e-admin-${faker.string.uuid()}`,
      permissions: String(1n << 16n),
      expirationDate: null,
    })

    expect(result.id).toBeTruthy()
    expect(result.password).toBeTruthy()
    expect(result.password.length).toBe(48)
    expect(result.name).toMatch(/^e2e-admin-/)
    expect(result.status).toBe('active')
    expect(result.permissions).toBe(String(1n << 16n))

    createdTokenIds.push(result.id)
    if (result.owner?.id) {
      createdBotUserIds.push(result.owner.id)
    }
  })

  it('should list active tokens by default and include revoked when requested', async () => {
    const tokenName = `e2e-admin-${faker.string.uuid()}`
    const created = await service.create({
      name: tokenName,
      permissions: String(1n << 16n),
      expirationDate: null,
    })
    createdTokenIds.push(created.id)
    if (created.owner?.id) createdBotUserIds.push(created.owner.id)

    const activeOnly = await service.list(false)
    expect(activeOnly.some(t => t.id === created.id)).toBe(true)
    expect(activeOnly.every(t => t.status === 'active')).toBe(true)

    const withRevoked = await service.list(true)
    expect(withRevoked.length).toBeGreaterThanOrEqual(activeOnly.length)
  })

  it('should revoke a token and exclude it from active list', async () => {
    const created = await service.create({
      name: `e2e-revoke-${faker.string.uuid()}`,
      permissions: String(1n << 16n),
      expirationDate: null,
    })
    createdTokenIds.push(created.id)
    if (created.owner?.id) createdBotUserIds.push(created.owner.id)

    await service.revoke(created.id)

    const activeOnly = await service.list(false)
    expect(activeOnly.some(t => t.id === created.id)).toBe(false)

    const withRevoked = await service.list(true)
    const revokedToken = withRevoked.find(t => t.id === created.id)
    expect(revokedToken).toBeTruthy()
    expect(revokedToken?.status).toBe('revoked')
  })

  it('should reject creation with expiration date in the past', async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString()
    await expect(service.create({
      name: `e2e-expired-${faker.string.uuid()}`,
      permissions: '0',
      expirationDate: yesterday,
    })).rejects.toThrow('Date d\'expiration trop courte')
  })

  it('should persist a salted scrypt hash of the password in DB', async () => {
    const created = await service.create({
      name: `e2e-hash-${faker.string.uuid()}`,
      permissions: String(1n << 16n),
      expirationDate: null,
    })
    createdTokenIds.push(created.id)
    if (created.owner?.id) createdBotUserIds.push(created.owner.id)

    const stored = await prisma.adminToken.findUniqueOrThrow({
      where: { id: created.id },
      select: { hash: true },
    })

    expect(stored.hash).toMatch(/^scrypt\$[0-9a-f]+\$[0-9a-f]+$/)
    expect(stored.hash).not.toContain(created.password)
  })

  it('should omit hash from API responses', async () => {
    const created = await service.create({
      name: `e2e-omit-${faker.string.uuid()}`,
      permissions: String(1n << 16n),
      expirationDate: null,
    })
    createdTokenIds.push(created.id)
    if (created.owner?.id) createdBotUserIds.push(created.owner.id)

    expect(created).not.toHaveProperty('hash')

    const listed = await service.list(true)
    const found = listed.find(t => t.id === created.id)
    expect(found).toBeTruthy()
    expect(found).not.toHaveProperty('hash')
  })
})
