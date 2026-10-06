import type { INestApplication } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { createHash } from 'node:crypto'
import { faker } from '@faker-js/faker'
import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { baseConfigFactory } from '../src/config/base.config'
import { AdminTokenModule } from '../src/modules/admin-token/admin-token.module'
import { PrismaService } from '../src/modules/infrastructure/database/prisma.service'
import { getDotenvPaths } from '../src/utils/dotenv.utils'

const canRunAdminTokenE2E
  = Boolean(process.env.E2E)

const describeWithAdminToken = describe.runIf(canRunAdminTokenE2E)

describeWithAdminToken('AdminToken HTTP (e2e)', () => {
  let app: INestApplication
  let baseUrl: string
  let prisma: PrismaService
  let tokenValue: string

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ envFilePath: getDotenvPaths(), isGlobal: true, load: [baseConfigFactory] }), AdminTokenModule],
    }).compile()

    await moduleRef.init()
    prisma = moduleRef.get(PrismaService)

    app = moduleRef.createNestApplication()
    await app.listen(0)
    const address = app.getHttpServer().address()
    if (address === null || typeof address === 'string') throw new Error('HTTP server did not report a port')
    baseUrl = `http://localhost:${address.port}`

    tokenValue = faker.string.alphanumeric(48)
    await prisma.user.create({
      data: {
        id: faker.string.uuid(),
        email: faker.internet.email().toLowerCase(),
        firstName: 'E2E',
        lastName: 'AdminTokenSpec',
        type: 'human',
        adminTokens: {
          create: {
            name: 'e2e-admin-token',
            permissions: BigInt('0b110000000000000000'),
            hash: createHash('sha256').update(tokenValue).digest('hex'),
          },
        },
      },
    })
  })

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { firstName: 'E2E', lastName: 'AdminTokenSpec' } })
    await app.close()
  })

  it('accepts GET without withRevoked', async () => {
    const response = await fetch(`${baseUrl}/api/v1/admin/tokens`, {
      headers: { 'x-dso-token': tokenValue },
    })

    expect(response.status).toBe(200)
  })

  it('rejects a delete with a non-uuid tokenId with 400', async () => {
    const response = await fetch(`${baseUrl}/api/v1/admin/tokens/not-an-uuid`, {
      method: 'DELETE',
      headers: { 'x-dso-token': tokenValue },
    })

    expect(response.status).toBe(400)
  })

  it('maps a too-close expiration date to a legacy-compatible 400', async () => {
    const response = await fetch(`${baseUrl}/api/v1/admin/tokens`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-dso-token': tokenValue },
      body: JSON.stringify({ name: 'legacy-parity', permissions: '4', expirationDate: new Date().toISOString() }),
    })

    expect(response.status).toBe(400)
    const body: { message?: unknown } = await response.json()
    expect(body.message).toBe('Date d\'expiration trop courte')
  })
})
