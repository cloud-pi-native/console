import type { INestApplication } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mock } from 'vitest-mock-extended'
import { AdminTokenController } from '../src/modules/admin-token/admin-token.controller'
import { AdminTokenService } from '../src/modules/admin-token/admin-token.service'
import { UserGuard } from '../src/modules/infrastructure/permission/user/user.guard'

describe('AdminToken HTTP validation', () => {
  let app: INestApplication
  let baseUrl: string

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AdminTokenController],
      providers: [{ provide: AdminTokenService, useValue: mock<AdminTokenService>() }],
    })
      .overrideGuard(UserGuard)
      .useValue({ canActivate: () => true })
      .compile()

    app = moduleRef.createNestApplication()
    await app.listen(0)
    const address = app.getHttpServer().address()
    if (address === null || typeof address === 'string') throw new Error('HTTP server did not report a port')
    baseUrl = `http://localhost:${address.port}`
  })

  afterAll(async () => {
    await app.close()
  })

  it('accepts GET without withRevoked', async () => {
    const response = await fetch(`${baseUrl}/api/v1/admin/tokens`)

    expect(response.status).toBe(200)
  })

  it('maps a too-close expiration date to a legacy-compatible 400', async () => {
    const response = await fetch(`${baseUrl}/api/v1/admin/tokens`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'legacy-parity', permissions: '4', expirationDate: new Date().toISOString() }),
    })

    expect(response.status).toBe(400)
    const body: { message?: unknown } = await response.json()
    expect(body.message).toBe('Date d\'expiration trop courte')
  })
})
