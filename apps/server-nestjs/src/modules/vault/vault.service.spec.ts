import { Test } from '@nestjs/testing'
import { VaultService } from './vault.service'
import { VaultClientService } from './vault-client.service'
import { ConfigurationService } from '@/cpin-module/infrastructure/configuration/configuration.service'
import { describe, beforeEach, it, expect, beforeAll, afterAll, afterEach, type Mocked } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

const vaultInternalUrl = 'http://vault.internal'

const server = setupServer(
  http.post(`${vaultInternalUrl}/v1/auth/token/create`, () => {
    return HttpResponse.json({ auth: { client_token: 'token' } })
  }),
  http.get(`${vaultInternalUrl}/v1/kv/data/:path`, () => {
    return HttpResponse.json({ data: { data: { secret: 'value' }, metadata: { created_time: '2023-01-01T00:00:00.000Z', version: 1 } } })
  }),
  http.post(`${vaultInternalUrl}/v1/kv/data/:path`, () => {
    return HttpResponse.json({})
  }),
  http.delete(`${vaultInternalUrl}/v1/kv/metadata/:path`, () => {
    return new HttpResponse(null, { status: 204 })
  }),
)

function createVaultServiceTestingModule() {
  return Test.createTestingModule({
    providers: [
      VaultService,
      VaultClientService,
      {
        provide: ConfigurationService,
        useValue: {
          vaultToken: 'token',
          vaultUrl: 'http://vault',
          vaultInternalUrl,
          vaultKvName: 'kv',
        } satisfies Partial<ConfigurationService>,
      },
    ],
  })
}

describe('vault', () => {
  let service: Mocked<VaultService>

  beforeAll(() => server.listen())
  beforeEach(async () => {
    const module = await createVaultServiceTestingModule().compile()
    service = module.get(VaultService)
  })
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  describe('getProjectValues', () => {
    it('should get project values', async () => {
      const result = await service.getProjectValues('project-id')
      expect(result).toEqual({ secret: 'value' })
    })

    it('should return empty object if undefined', async () => {
      server.use(
        http.get(`${vaultInternalUrl}/v1/kv/data/:path`, () => {
          return new HttpResponse(null, { status: 404 })
        }),
      )

      const result = await service.getProjectValues('project-id')
      expect(result).toEqual({})
    })
  })

  describe('read', () => {
    it('should read secret', async () => {
      const result = await service.read('path')
      expect(result).toEqual({ data: { secret: 'value' }, metadata: { created_time: '2023-01-01T00:00:00.000Z', version: 1 } })
    })

    it('should return undefined if 404', async () => {
      server.use(
        http.get(`${vaultInternalUrl}/v1/kv/data/:path`, () => {
          return new HttpResponse(null, { status: 404 })
        }),
      )

      const result = await service.read('path')
      expect(result).toBeUndefined()
    })
  })

  describe('write', () => {
    it('should write secret', async () => {
      await service.write({ secret: 'value' }, 'path')
    })
  })

  describe('destroy', () => {
    it('should destroy secret', async () => {
      await service.destroy('path')
    })
  })
})
