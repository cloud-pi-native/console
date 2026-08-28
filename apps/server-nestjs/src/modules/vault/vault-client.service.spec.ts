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

  beforeAll(() => server.listen())
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

    it('should throw InvalidResponse when the data wrapper is missing', async () => {
      server.use(
        http.get(`${vaultUrl}/v1/kv/data/:path`, () => {
          return HttpResponse.json({})
        }),
      )

      await expect(service.read('path')).rejects.toMatchObject({
        kind: 'InvalidResponse',
        message: 'Missing "data" field',
        method: 'GET',
        path: 'kv/data/path',
      })
    })

    it('should throw InvalidResponse when the data field is null', async () => {
      server.use(
        http.get(`${vaultUrl}/v1/kv/data/:path`, () => {
          return HttpResponse.json({ data: null })
        }),
      )

      await expect(service.read('path')).rejects.toMatchObject({ kind: 'InvalidResponse' })
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

  describe('http error mapping', () => {
    it.each([
      HttpStatus.FORBIDDEN,
      HttpStatus.CONFLICT,
      HttpStatus.INTERNAL_SERVER_ERROR,
      HttpStatus.SERVICE_UNAVAILABLE,
    ])('maps status %i to HttpError with the status preserved', async (status) => {
      server.use(
        http.post(`${vaultUrl}/v1/kv/data/:path`, () => {
          return HttpResponse.json({ errors: [`permission denied (${status})`] }, { status })
        }),
      )

      await expect(service.write({ secret: 'value' }, 'path')).rejects.toMatchObject({
        kind: 'HttpError',
        status,
        method: 'POST',
        reasons: [`permission denied (${status})`],
      })
    })

    it('preserves reasons on a 404 NotFound', async () => {
      server.use(
        http.post(`${vaultUrl}/v1/kv/data/:path`, () => {
          return HttpResponse.json({ errors: ['no handler for route'] }, { status: HttpStatus.NOT_FOUND })
        }),
      )

      await expect(service.write({}, 'path')).rejects.toMatchObject({
        kind: 'NotFound',
        status: HttpStatus.NOT_FOUND,
        reasons: ['no handler for route'],
      })
    })

    it('leaves reasons undefined when the error body has no errors array', async () => {
      server.use(
        http.post(`${vaultUrl}/v1/kv/data/:path`, () => {
          return HttpResponse.json({ unexpected: 'shape' }, { status: HttpStatus.BAD_GATEWAY })
        }),
      )

      await expect(service.write({}, 'path')).rejects.toMatchObject({
        kind: 'HttpError',
        status: HttpStatus.BAD_GATEWAY,
        reasons: undefined,
      })
    })

    it('wraps a non-JSON error body (proxy HTML page) in HttpError', async () => {
      server.use(
        http.post(`${vaultUrl}/v1/kv/data/:path`, () => {
          return new HttpResponse('<html>gateway error</html>', { status: HttpStatus.SERVICE_UNAVAILABLE, headers: { 'content-type': 'text/html' } })
        }),
      )

      await expect(service.write({}, 'path')).rejects.toMatchObject({
        kind: 'HttpError',
        status: HttpStatus.SERVICE_UNAVAILABLE,
        method: 'POST',
      })
    })

    it('swallows a non-JSON 404 via the NotFound guard', async () => {
      server.use(
        http.delete(`${vaultUrl}/v1/kv/metadata/:path`, () => {
          return new HttpResponse('not json', { status: HttpStatus.NOT_FOUND })
        }),
      )

      await expect(service.delete('path')).resolves.toBeUndefined()
    })

    it('maps network failure to Unexpected', async () => {
      server.use(
        http.post(`${vaultUrl}/v1/kv/data/:path`, () => {
          return HttpResponse.error()
        }),
      )

      await expect(service.write({}, 'path')).rejects.toMatchObject({
        kind: 'Unexpected',
        method: 'POST',
        path: 'kv/data/path',
      })
    })

    it('returns null on 204 No Content', async () => {
      server.use(
        http.get(`${vaultUrl}/v1/sys/auth`, () => {
          return new HttpResponse(null, { status: HttpStatus.NO_CONTENT })
        }),
      )

      await expect(service.getSysAuth()).resolves.toEqual({})
    })

    it('coalesces a missing data wrapper to {} on getSysAuth', async () => {
      server.use(
        http.get(`${vaultUrl}/v1/sys/auth`, () => {
          return HttpResponse.json({})
        }),
      )

      await expect(service.getSysAuth()).resolves.toEqual({})
    })
  })

  describe('listKvMetadata', () => {
    it('returns keys on success', async () => {
      let capturedMethod: string | undefined
      server.use(
        http.all(`${vaultUrl}/v1/kv/metadata/*`, async ({ request }) => {
          capturedMethod = request.method
          return HttpResponse.json({ data: { keys: ['SONAR', 'tech/'] } })
        }),
      )

      await expect(service.listKvMetadata('kv', 'forge/my-project')).resolves.toEqual(['SONAR', 'tech/'])
      expect(capturedMethod).toBe('LIST')
    })

    it('throws InvalidResponse when data.keys is missing', async () => {
      server.use(
        http.all(`${vaultUrl}/v1/kv/metadata/*`, () => {
          return HttpResponse.json({ data: {} })
        }),
      )

      await expect(service.listKvMetadata('kv', 'forge/my-project')).rejects.toMatchObject({
        kind: 'InvalidResponse',
        message: 'Missing "data.keys" field',
        method: 'LIST',
      })
    })

    it('returns [] on 404 instead of throwing', async () => {
      server.use(
        http.all(`${vaultUrl}/v1/kv/metadata/*`, () => {
          return HttpResponse.json({ errors: [] }, { status: HttpStatus.NOT_FOUND })
        }),
      )

      await expect(service.listKvMetadata('kv', 'forge/my-project')).resolves.toEqual([])
    })

    it('rethrows non-404 HttpErrors', async () => {
      server.use(
        http.all(`${vaultUrl}/v1/kv/metadata/*`, () => {
          return HttpResponse.json({ errors: ['sealed'] }, { status: HttpStatus.SERVICE_UNAVAILABLE })
        }),
      )

      await expect(service.listKvMetadata('kv', 'forge/my-project')).rejects.toMatchObject({
        kind: 'HttpError',
        status: HttpStatus.SERVICE_UNAVAILABLE,
      })
    })
  })

  describe('approle edges', () => {
    let capturedBody: any

    beforeEach(() => {
      capturedBody = undefined
      server.use(
        http.post(`${vaultUrl}/v1/auth/approle/role/:role`, async ({ request }) => {
          capturedBody = await request.json()
          return HttpResponse.json({})
        }),
      )
    })

    it('upserts with empty token_policies sent verbatim', async () => {
      await service.upsertAuthApproleRole('zone-prod', {
        secret_id_num_uses: '0',
        secret_id_ttl: '0',
        token_max_ttl: '0',
        token_num_uses: '0',
        token_ttl: '0',
        token_type: 'batch',
        token_policies: [],
      })

      expect(capturedBody.token_policies).toEqual([])
      expect(capturedBody.token_type).toBe('batch')
    })

    it('reads role-id', async () => {
      server.use(
        http.get(`${vaultUrl}/v1/auth/approle/role/:role/role-id`, () => {
          return HttpResponse.json({ data: { role_id: 'role-id-123' } })
        }),
      )

      await expect(service.getAuthApproleRoleRoleId('zone-prod')).resolves.toBe('role-id-123')
    })

    it('throws InvalidResponse when role-id data wrapper is missing', async () => {
      server.use(
        http.get(`${vaultUrl}/v1/auth/approle/role/:role/role-id`, () => {
          return HttpResponse.json({})
        }),
      )

      await expect(service.getAuthApproleRoleRoleId('zone-prod')).rejects.toMatchObject({
        kind: 'InvalidResponse',
        method: 'GET',
        path: 'auth/approle/role/zone-prod/role-id',
      })
    })

    it('creates a secret-id', async () => {
      server.use(
        http.post(`${vaultUrl}/v1/auth/approle/role/:role/secret-id`, () => {
          return HttpResponse.json({ data: { secret_id: 'secret-id-123' } })
        }),
      )

      await expect(service.createAuthApproleRoleSecretId('zone-prod')).resolves.toBe('secret-id-123')
    })

    it('throws InvalidResponse when secret_id is missing from the response', async () => {
      server.use(
        http.post(`${vaultUrl}/v1/auth/approle/role/:role/secret-id`, () => {
          return HttpResponse.json({})
        }),
      )

      await expect(service.createAuthApproleRoleSecretId('zone-prod')).rejects.toMatchObject({
        kind: 'InvalidResponse',
        method: 'POST',
        path: 'auth/approle/role/zone-prod/secret-id',
      })
    })

    it('propagates 403 as HttpError on secret-id creation', async () => {
      server.use(
        http.post(`${vaultUrl}/v1/auth/approle/role/:role/secret-id`, () => {
          return HttpResponse.json({ errors: ['permission denied'] }, { status: HttpStatus.FORBIDDEN })
        }),
      )

      await expect(service.createAuthApproleRoleSecretId('zone-prod')).rejects.toMatchObject({
        kind: 'HttpError',
        status: HttpStatus.FORBIDDEN,
      })
    })
  })

  describe('identity group edges', () => {
    it('passes empty policies through verbatim on upsert', async () => {
      let capturedBody: any
      server.use(
        http.post(`${vaultUrl}/v1/identity/group/name/:name`, async ({ request }) => {
          capturedBody = await request.json()
          return HttpResponse.json({})
        }),
      )

      await service.upsertIdentityGroupName('project-x-admin', { name: 'project-x-admin', type: 'external', policies: [] })

      expect(capturedBody.policies).toEqual([])
      expect(capturedBody.type).toBe('external')
    })

    // Locks current leniency: a missing data wrapper passes straight through; only the
    // ensureIdentityGroup caller (vault.service.ts) validates data.id afterwards.
    it('returns a data-less response unchanged from getIdentityGroupName', async () => {
      server.use(
        http.get(`${vaultUrl}/v1/identity/group/name/:name`, () => {
          return HttpResponse.json({})
        }),
      )

      await expect(service.getIdentityGroupName('project-x-admin')).resolves.toEqual({})
    })

    it('throws InvalidResponse on an empty (204) getIdentityGroupName response', async () => {
      server.use(
        http.get(`${vaultUrl}/v1/identity/group/name/:name`, () => {
          return new HttpResponse(null, { status: HttpStatus.NO_CONTENT })
        }),
      )

      await expect(service.getIdentityGroupName('project-x-admin')).rejects.toMatchObject({
        kind: 'InvalidResponse',
        message: 'Empty response',
      })
    })

    it('deletes identity groups', async () => {
      let method: string | undefined
      server.use(
        http.delete(`${vaultUrl}/v1/identity/group/name/:name`, ({ request }) => {
          method = request.method
          return HttpResponse.json({})
        }),
      )

      await expect(service.deleteIdentityGroupName('project-x-admin')).resolves.toBeUndefined()
      expect(method).toBe('DELETE')
    })
  })

  describe('credential helpers', () => {
    it('readGitlabMirrorCreds returns null on NotFound', async () => {
      server.use(
        http.get(`${vaultUrl}/v1/kv/data/*`, () => {
          return HttpResponse.json({ errors: [] }, { status: HttpStatus.NOT_FOUND })
        }),
      )

      await expect(service.readGitlabMirrorCreds('my-project', 'repo')).resolves.toBeNull()
    })

    it('readGitlabMirrorCreds rethrows non-NotFound errors', async () => {
      server.use(
        http.get(`${vaultUrl}/v1/kv/data/*`, () => {
          return HttpResponse.json({ errors: ['boom'] }, { status: HttpStatus.INTERNAL_SERVER_ERROR })
        }),
      )

      await expect(service.readGitlabMirrorCreds('my-project', 'repo')).rejects.toMatchObject({
        kind: 'HttpError',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      })
    })

    it('readTechnReadOnlyCreds rethrows non-NotFound errors', async () => {
      server.use(
        http.get(`${vaultUrl}/v1/kv/data/*`, () => {
          return HttpResponse.json({ errors: ['boom'] }, { status: HttpStatus.CONFLICT })
        }),
      )

      await expect(service.readTechnReadOnlyCreds('my-project')).rejects.toMatchObject({
        kind: 'HttpError',
        status: HttpStatus.CONFLICT,
      })
    })

    it('deleteGitlabMirrorCreds tolerates NotFound', async () => {
      server.use(
        http.delete(`${vaultUrl}/v1/kv/metadata/*`, () => {
          return HttpResponse.json({ errors: [] }, { status: HttpStatus.NOT_FOUND })
        }),
      )

      await expect(service.deleteGitlabMirrorCreds('my-project', 'repo')).resolves.toBeUndefined()
    })

    it('deleteSonarqubeUser tolerates NotFound', async () => {
      server.use(
        http.delete(`${vaultUrl}/v1/kv/metadata/*`, () => {
          return HttpResponse.json({ errors: [] }, { status: HttpStatus.NOT_FOUND })
        }),
      )

      await expect(service.deleteSonarqubeUser('my-project')).resolves.toBeUndefined()
    })
  })
})
