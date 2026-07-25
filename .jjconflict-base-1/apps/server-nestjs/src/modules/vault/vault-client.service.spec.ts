import type { BaseConfig } from '../infrastructure/config/base.config'
import type { VaultConfig } from './vault.module-definition'
import { HttpStatus } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { BASE_CONFIG } from '../infrastructure/config/base.config'
import { VaultClientService } from './vault-client.service'
import { VaultError, VaultHttpClientService } from './vault-http-client.service'
import { VAULT_CONFIG } from './vault.module-definition'

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
    return new HttpResponse(null, { status: HttpStatus.NO_CONTENT })
  }),
)

describe('vault', () => {
  let service: VaultClientService

  beforeAll(() => server.listen())
  beforeEach(async () => {
    const config = mockDeep<VaultConfig>({
      token: 'token',
      url: vaultUrl,
      internalUrl: vaultUrl,
      kvName: 'kv',
      internalOrPublicUrl: vaultUrl,
    })
    const baseConfig = mockDeep<BaseConfig>({
      projectsRootDir: 'forge',
    })

    const module = await Test.createTestingModule({
      providers: [
        VaultClientService,
        VaultHttpClientService,
        { provide: VAULT_CONFIG, useValue: config },
        { provide: BASE_CONFIG, useValue: baseConfig },
      ],
    }).compile()

    service = module.get(VaultClientService)
  })
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

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
          return HttpResponse.json({}, { status: HttpStatus.NOT_FOUND })
        }),
      )

      await expect(service.read('path')).rejects.toBeInstanceOf(VaultError)
      await expect(service.read('path')).rejects.toMatchObject({ kind: 'NotFound', status: HttpStatus.NOT_FOUND })
    })
  })

  describe('write', () => {
    it('should write secret', async () => {
      await expect(service.write({ secret: 'value' }, 'path')).resolves.toBeUndefined()
    })

    it('should expose reasons on error', async () => {
      server.use(
        http.post(`${vaultUrl}/v1/kv/data/:path`, () => {
          return HttpResponse.json({ errors: ['No secret engine mount at test-project/'] }, { status: HttpStatus.BAD_REQUEST })
        }),
      )

      await expect(service.write({ secret: 'value' }, 'path')).rejects.toBeInstanceOf(VaultError)
      await expect(service.write({ secret: 'value' }, 'path')).rejects.toMatchObject({
        kind: 'HttpError',
        status: HttpStatus.BAD_REQUEST,
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
