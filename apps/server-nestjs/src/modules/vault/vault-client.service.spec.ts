import { Test } from '@nestjs/testing'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { VaultClientService, VaultError } from './vault-client.service'
import { VaultHttpClientService } from './vault-http-client.service'

const vaultUrl = 'https://vault.internal'

const server = setupServer(
  http.post(`${vaultUrl}/v1/auth/token/create`, () => {
    return HttpResponse.json({ auth: { client_token: 'token' } })
  }),
  http.get(`${vaultUrl}/v1/kv/data/:path`, () => {
    return HttpResponse.json({ data: { data: { secret: 'value' }, metadata: { created_time: '2023-01-01T00:00:00.000Z', version: 1 } } })
  }),
  http.post(`${vaultUrl}/v1/kv/data/:path`, () => {
    return HttpResponse.json({})
  }),
  http.delete(`${vaultUrl}/v1/kv/metadata/:path`, () => {
    return new HttpResponse(null, { status: 204 })
  }),
)

function createVaultServiceTestingModule() {
  return Test.createTestingModule({
    providers: [
      VaultClientService,
      VaultHttpClientService,
      {
        provide: ConfigurationService,
        useValue: {
          vaultToken: 'token',
          vaultUrl,
          vaultInternalUrl: vaultUrl,
          vaultKvName: 'kv',
        } satisfies Partial<ConfigurationService>,
      },
    ],
  })
}

describe('vault', () => {
  let service: VaultClientService

  beforeAll(() => server.listen())
  beforeEach(async () => {
    const module = await createVaultServiceTestingModule().compile()
    service = module.get(VaultClientService)
  })
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  describe('getProjectValues', () => {
    it('should get project values', async () => {
      const result = await service.readProjectValues('project-id')
      expect(result).toEqual({ secret: 'value' })
    })

    it('should return empty object if undefined', async () => {
      server.use(
        http.get(`${vaultUrl}/v1/kv/data/:path`, () => {
          return HttpResponse.json({}, { status: 404 })
        }),
      )

      const result = await service.readProjectValues('project-id')
      expect(result).toEqual(undefined)
    })
  })

  describe('read', () => {
    it('should read secret', async () => {
      const result = await service.read('path')
      expect(result).toEqual({
        data: { secret: 'value' },
        metadata: { created_time: '2023-01-01T00:00:00.000Z', version: 1 },
      })
    })

    it('should throw if 404', async () => {
      server.use(
        http.get(`${vaultUrl}/v1/kv/data/:path`, () => {
          return HttpResponse.json({}, { status: 404 })
        }),
      )

      await expect(service.read('path')).rejects.toBeInstanceOf(VaultError)
      await expect(service.read('path')).rejects.toMatchObject({ kind: 'NotFound', status: 404 })
    })
  })

  describe('write', () => {
    it('should write secret', async () => {
      await expect(service.write({ secret: 'value' }, 'path')).resolves.toBeUndefined()
    })

    it('should expose reasons on error', async () => {
      server.use(
        http.post(`${vaultUrl}/v1/kv/data/:path`, () => {
          return HttpResponse.json({ errors: ['No secret engine mount at test-project/'] }, { status: 400 })
        }),
      )

      await expect(service.write({ secret: 'value' }, 'path')).rejects.toBeInstanceOf(VaultError)
      await expect(service.write({ secret: 'value' }, 'path')).rejects.toMatchObject({
        kind: 'HttpError',
        status: 400,
        reasons: ['No secret engine mount at test-project/'],
      })
      await expect(service.write({ secret: 'value' }, 'path')).rejects.toThrow('Request failed')
    })
  })

  describe('delete', () => {
    it('should delete secret', async () => {
      await expect(service.delete('path')).resolves.toBeUndefined()
    })
  })
})
