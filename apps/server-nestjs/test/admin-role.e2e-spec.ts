import type { INestApplication } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { createHash } from 'node:crypto'
import { faker } from '@faker-js/faker'
import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { baseConfigFactory } from '../src/config/base.config'
import { AdminRoleModule } from '../src/modules/admin-role/admin-role.module'
import { PrismaService } from '../src/modules/infrastructure/database/prisma.service'
import { getDotenvPaths } from '../src/utils/dotenv.utils'

const canRunAdminRoleE2E
  = Boolean(process.env.E2E)

const describeWithAdminRole = describe.runIf(canRunAdminRoleE2E)

describeWithAdminRole('AdminRole HTTP (e2e)', () => {
  let app: INestApplication
  let baseUrl: string
  let prisma: PrismaService
  let tokenValue: string

  let roleId: string

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ envFilePath: getDotenvPaths(), isGlobal: true, load: [baseConfigFactory] }), AdminRoleModule],
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
        lastName: 'AdminRoleToken',
        type: 'human',
        adminTokens: {
          create: {
            name: 'e2e-admin-role',
            permissions: BigInt('0b10010'),
            hash: createHash('sha256').update(tokenValue).digest('hex'),
          },
        },
      },
    })
  })

  afterAll(async () => {
    if (roleId) {
      await prisma.adminRole.deleteMany({ where: { id: roleId } })
    }
    await prisma.user.deleteMany({ where: { firstName: 'E2E', lastName: 'AdminRoleToken' } })
    await app.close()
  })

  it('rejects a create without a name with 400', async () => {
    const response = await fetch(`${baseUrl}/api/v1/admin/roles`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-dso-token': tokenValue },
      body: JSON.stringify({}),
    })

    expect(response.status).toBe(400)
  })

  it('creates a role with 201 and lists it back', async () => {
    const name = `e2e-${faker.string.alphanumeric({ length: 8, casing: 'lower' })}`
    const response = await fetch(`${baseUrl}/api/v1/admin/roles`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-dso-token': tokenValue },
      body: JSON.stringify({ name }),
    })

    expect(response.status).toBe(201)
    const created: { id: string, name: string } = await response.json()
    roleId = created.id
    expect(created.name).toBe(name)

    const listResponse = await fetch(`${baseUrl}/api/v1/admin/roles`, {
      headers: { 'x-dso-token': tokenValue },
    })
    expect(listResponse.status).toBe(200)
    const list: { id: string }[] = await listResponse.json()
    expect(list.some(role => role.id === roleId)).toBe(true)
  })

  it('rejects a patch with a negative position with 400', async () => {
    const response = await fetch(`${baseUrl}/api/v1/admin/roles`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-dso-token': tokenValue },
      body: JSON.stringify([{ id: faker.string.uuid(), position: -1 }]),
    })

    expect(response.status).toBe(400)
  })

  it('rejects a delete with a non-uuid roleId with 400', async () => {
    const response = await fetch(`${baseUrl}/api/v1/admin/roles/not-an-uuid`, {
      method: 'DELETE',
      headers: { 'x-dso-token': tokenValue },
    })

    expect(response.status).toBe(400)
  })

  it('deletes a role with 204', async () => {
    const response = await fetch(`${baseUrl}/api/v1/admin/roles/${roleId}`, {
      method: 'DELETE',
      headers: { 'x-dso-token': tokenValue },
    })

    expect(response.status).toBe(204)
    roleId = ''
  })
})
