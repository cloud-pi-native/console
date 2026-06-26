import type { TestingModule } from '@nestjs/testing'
import { createHash } from 'node:crypto'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { PrismaService } from '../src/modules/infrastructure/database/prisma.service'
import { UserTokensModule } from '../src/modules/user-tokens/user-tokens.module'
import { UserTokensService } from '../src/modules/user-tokens/user-tokens.service'

const canRunUserTokensE2E = Boolean(process.env.E2E) && Boolean(process.env.DB_URL)

const describeWithUserTokens = describe.runIf(canRunUserTokensE2E)

describeWithUserTokens('UserTokensService (e2e)', () => {
  let moduleRef: TestingModule
  let service: UserTokensService
  let prisma: PrismaService

  const createdTokenIds: string[] = []
  const createdUserIds: string[] = []
  let ownerId: string
  let otherUserId: string

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [UserTokensModule],
    }).compile()

    await moduleRef.init()

    service = moduleRef.get(UserTokensService)
    prisma = moduleRef.get(PrismaService)

    ownerId = faker.string.uuid()
    otherUserId = faker.string.uuid()

    await prisma.user.create({
      data: {
        id: ownerId,
        email: faker.internet.email().toLowerCase(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        type: 'human',
        adminRoleIds: [],
      },
    })
    createdUserIds.push(ownerId)

    await prisma.user.create({
      data: {
        id: otherUserId,
        email: faker.internet.email().toLowerCase(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        type: 'human',
        adminRoleIds: [],
      },
    })
    createdUserIds.push(otherUserId)
  })

  afterAll(async () => {
    if (prisma) {
      await prisma.personalAccessToken.deleteMany({ where: { id: { in: createdTokenIds } } }).catch(() => {})
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } }).catch(() => {})
    }

    await moduleRef?.close()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('should create a personal access token with plaintext password', async () => {
    const result = await service.create({
      name: `e2e-pat-${faker.string.uuid()}`,
      expirationDate: new Date(Date.now() + 86400000).toISOString(),
    }, ownerId)

    expect(result.id).toBeTruthy()
    expect(result.password).toBeTruthy()
    expect(result.password.length).toBe(48)
    expect(result.name).toMatch(/^e2e-pat-/)
    expect(result.expirationDate).toBeTruthy()

    createdTokenIds.push(result.id)
  })

  it('should list only tokens for the requesting user', async () => {
    const tokenName = `e2e-pat-list-${faker.string.uuid()}`
    const created = await service.create({
      name: tokenName,
      expirationDate: new Date(Date.now() + 86400000).toISOString(),
    }, ownerId)
    createdTokenIds.push(created.id)

    const otherTokenName = `e2e-pat-other-${faker.string.uuid()}`
    const otherToken = await service.create({
      name: otherTokenName,
      expirationDate: new Date(Date.now() + 86400000).toISOString(),
    }, otherUserId)
    createdTokenIds.push(otherToken.id)

    const userTokens = await service.list(ownerId)
    expect(userTokens.some(t => t.id === created.id)).toBe(true)
    expect(userTokens.some(t => t.id === otherToken.id)).toBe(false)
  })

  it('should hard-delete token and remove it from list', async () => {
    const created = await service.create({
      name: `e2e-pat-delete-${faker.string.uuid()}`,
      expirationDate: new Date(Date.now() + 86400000).toISOString(),
    }, ownerId)
    createdTokenIds.push(created.id)

    await service.delete(created.id, ownerId)

    const userTokens = await service.list(ownerId)
    expect(userTokens.some(t => t.id === created.id)).toBe(false)

    const stored = await prisma.personalAccessToken.findUnique({ where: { id: created.id } })
    expect(stored).toBeNull()
  })

  it('should not delete another user\'s token', async () => {
    const otherToken = await service.create({
      name: `e2e-pat-foreign-${faker.string.uuid()}`,
      expirationDate: new Date(Date.now() + 86400000).toISOString(),
    }, otherUserId)
    createdTokenIds.push(otherToken.id)

    await service.delete(otherToken.id, ownerId)

    const stored = await prisma.personalAccessToken.findUnique({ where: { id: otherToken.id } })
    expect(stored).not.toBeNull()
  })

  it('should reject creation with expiration date in the past', async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString()
    await expect(service.create({
      name: `e2e-pat-expired-${faker.string.uuid()}`,
      expirationDate: yesterday,
    }, ownerId)).rejects.toThrow('Date d\'expiration trop courte')
  })

  it('should persist SHA256 hash of the password in DB', async () => {
    const created = await service.create({
      name: `e2e-pat-hash-${faker.string.uuid()}`,
      expirationDate: new Date(Date.now() + 86400000).toISOString(),
    }, ownerId)
    createdTokenIds.push(created.id)

    const stored = await prisma.personalAccessToken.findUniqueOrThrow({
      where: { id: created.id },
      select: { hash: true },
    })

    const expectedHash = createHash('sha256').update(created.password).digest('hex')
    expect(stored.hash).toBe(expectedHash)
  })

  it('should omit hash from API responses', async () => {
    const created = await service.create({
      name: `e2e-pat-omit-${faker.string.uuid()}`,
      expirationDate: new Date(Date.now() + 86400000).toISOString(),
    }, ownerId)
    createdTokenIds.push(created.id)

    expect(created).not.toHaveProperty('hash')

    const listed = await service.list(ownerId)
    const found = listed.find(t => t.id === created.id)
    expect(found).toBeTruthy()
    expect(found).not.toHaveProperty('hash')
  })
})
