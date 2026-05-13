import { HttpStatus } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
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

function createVaultServiceTestingModule(config: Partial<ConfigurationService> = {}) {
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
          projectRootDir: 'forge',
          deployVaultConnectionInNamespaces: false,
          getInternalOrPublicVaultUrl: () => vaultUrl,
          ...config,
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
    it('should get project values without AppRole credentials if role does not exist', async () => {
      server.use(
        http.get(`${vaultUrl}/v1/auth/approle/role/:roleName/role-id`, () => {
          return HttpResponse.json({}, { status: HttpStatus.NOT_FOUND })
        }),
      )

      const result = await service.readProjectValues('project-id')
      expect(result).toEqual({
        projectsRootDir: 'forge',
        url: '',
        coreKvName: 'kv',
        roleId: 'none',
        secretId: 'none',
      })
    })

    it('should get project values with AppRole credentials', async () => {
      server.use(
        http.get(`${vaultUrl}/v1/auth/approle/role/:roleName/role-id`, () => {
          return HttpResponse.json({ data: { role_id: 'role-id' } })
        }),
        http.post(`${vaultUrl}/v1/auth/approle/role/:roleName/secret-id`, () => {
          return HttpResponse.json({ data: { secret_id: 'secret-id' } })
        }),
      )

      const module = await createVaultServiceTestingModule({ deployVaultConnectionInNamespaces: true }).compile()
      service = module.get(VaultClientService)

      const result = await service.readProjectValues('project-id')
      expect(result).toEqual({
        projectsRootDir: 'forge',
        url: vaultUrl,
        coreKvName: 'kv',
        roleId: 'role-id',
        secretId: 'secret-id',
      })
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
