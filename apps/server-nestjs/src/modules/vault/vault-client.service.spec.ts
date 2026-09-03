import type { ConfigType } from '@nestjs/config'
import { faker } from '@faker-js/faker'
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
import { makeVaultDb, makeVaultHandlers, VAULT_INTERNAL_URL } from './vault-testing.utils'

const server = setupServer()

describe('vault', () => {
  let service: VaultClientService
  let db: ReturnType<typeof makeVaultDb>

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  beforeEach(async () => {
    db = makeVaultDb()
    server.use(...makeVaultHandlers(db))

    const config = mockDeep<ConfigType<typeof vaultConfigFactory>>({
      token: faker.string.sample(32),
      url: VAULT_INTERNAL_URL,
      internalUrl: VAULT_INTERNAL_URL,
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
      const path = faker.string.uuid()
      const secretValue = faker.string.sample(8)
      const createdTime = faker.date.past().toISOString()
      await db.kv.create({
        path,
        data: { secret: secretValue },
        metadata: { created_time: createdTime, destroyed: false, version: 1 },
      })

      const result = await service.read(path)
      expect(result).toEqual({
        data: { secret: secretValue },
        metadata: { created_time: createdTime, destroyed: false, version: 1 },
      })
    })

    it('should throw if 404', async () => {
      const path = faker.string.uuid()
      await expect(service.read(path)).rejects.toBeInstanceOf(VaultError)
      await expect(service.read(path)).rejects.toMatchObject({ kind: 'NotFound', status: HttpStatus.NOT_FOUND })
    })
  })

  describe('readGitlabSecrets', () => {
    it('reads a project group and returns raw vault data', async () => {
      const projectSlug = faker.string.uuid()
      const secretData = {
        key1: faker.string.sample(8),
        key2: faker.number.int(),
        key3: faker.helpers.arrayElement([true, false]),
        key4: null,
      }
      await db.kv.create({
        path: `forge/${projectSlug}/GITLAB`,
        data: secretData,
        metadata: { created_time: faker.date.past().toISOString(), destroyed: false, version: 1 },
      })

      const result = await service.readGitlabSecrets(projectSlug)
      expect(result).toEqual(secretData)
    })

    it('returns {} when the secret is missing', async () => {
      const projectSlug = faker.string.uuid()
      const result = await service.readGitlabSecrets(projectSlug)
      expect(result).toEqual({})
    })
  })

  describe('write', () => {
    it('should write secret', async () => {
      const path = faker.string.uuid()
      const data = { secret: faker.string.sample(8) }
      await expect(service.write(data, path)).resolves.toBeUndefined()
    })

    it('should expose reasons on error', async () => {
      const path = faker.string.uuid()
      const reason = faker.lorem.sentence()
      server.use(
        http.post(`${VAULT_INTERNAL_URL}/v1/kv/data/*`, () =>
          HttpResponse.json({ errors: [reason] }, { status: HttpStatus.BAD_REQUEST })),
      )

      await expect(service.write({ secret: faker.string.sample(8) }, path)).rejects.toBeInstanceOf(VaultError)
      await expect(service.write({ secret: faker.string.sample(8) }, path)).rejects.toMatchObject({
        kind: 'HttpError',
        status: HttpStatus.BAD_REQUEST,
        reasons: [reason],
      })
      await expect(service.write({ secret: faker.string.sample(8) }, path)).rejects.toThrow('Request failed')
    })
  })

  describe('delete', () => {
    it('should delete secret', async () => {
      const path = faker.string.uuid()
      await db.kv.create({
        path,
        data: {},
        metadata: { created_time: faker.date.past().toISOString(), destroyed: false, version: 1 },
      })
      await expect(service.delete(path)).resolves.toBeUndefined()
    })
  })

  describe('writeMirrorTriggerToken', () => {
    it('writes under the project path', async () => {
      const projectSlug = faker.string.uuid()
      let capturedPath: string | undefined
      server.use(
        http.post(`${VAULT_INTERNAL_URL}/v1/kv/data/*`, async ({ request }) => {
          capturedPath = new URL(request.url).pathname.replace('/v1/kv/data/', '')
          return HttpResponse.json({})
        }),
      )
      await service.writeMirrorTriggerToken(projectSlug, { PROJECT_SLUG: projectSlug })
      expect(capturedPath).toBe(`forge/${projectSlug}/GITLAB`)
    })
  })
})
