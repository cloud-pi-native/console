import type { ConfigType } from '@nestjs/config'
import { HttpStatus } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { baseConfigFactory } from '../../config/base.config'
import { vaultConfigFactory } from '../../config/vault.config'
import { VaultClientService } from './vault-client.service'
import { VaultError, VaultHttpClientService } from './vault-http-client.service'

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

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  beforeEach(async () => {
    const config = mockDeep<ConfigType<typeof vaultConfigFactory>>({
      token: 'token',
      url: vaultUrl,
      internalUrl: vaultUrl,
      kvName: 'kv',
    })
    const baseConfig = mockDeep<ConfigType<typeof baseConfigFactory>>({
      projectsRootDir: 'forge',
    })

    const module = await Test.createTestingModule({
      providers: [
        VaultClientService,
        VaultHttpClientService,
        { provide: vaultConfigFactory.KEY, useValue: config },
        { provide: baseConfigFactory.KEY, useValue: baseConfig },
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

  describe('readGitlabSecrets', () => {
    it('reads a project group and returns raw vault data', async () => {
      server.use(
        http.get(`${vaultUrl}/v1/kv/data/*`, () => {
          return HttpResponse.json({ data: { data: { key1: 'value1', key2: 42, key3: false, key4: null }, metadata: { created_time: '2023-01-01T00:00:00.000Z', version: 1 } } })
        }),
      )

      const result = await service.readGitlabSecrets('my-project')

      expect(result).toEqual({ key1: 'value1', key2: 42, key3: false, key4: null })
    })

    it('returns {} when the secret is missing', async () => {
      server.use(
        http.get(`${vaultUrl}/v1/kv/data/*`, () => {
          return HttpResponse.json({}, { status: HttpStatus.NOT_FOUND })
        }),
      )

      const result = await service.readGitlabSecrets('my-project')

      expect(result).toEqual({})
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

  describe('writeMirrorTriggerToken', () => {
    it('writes under the project path', async () => {
      let capturedPath: string | undefined
      server.use(
        http.post(`${vaultUrl}/v1/kv/data/*`, ({ request }) => {
          capturedPath = new URL(request.url).pathname.replace('/v1/kv/data/', '')
          return HttpResponse.json({})
        }),
      )
      await service.writeMirrorTriggerToken('my-project', { PROJECT_SLUG: 'my-project' })
      expect(capturedPath).toBe('forge/my-project/GITLAB')
    })
  })
})
