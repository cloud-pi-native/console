import type { ConfigType } from '@nestjs/config'
import { faker } from '@faker-js/faker'
import { HttpStatus } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { baseConfigFactory } from '../../../config/base.config'
import { vaultConfigFactory } from '../../../config/vault.config'
import { VaultClientService } from './vault-client.service'
import { VaultError, VaultHttpClientService } from './vault-http-client.service'
import { makeProjectSlug, makeRepoName } from './vault-testing.utils'

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
  })

  describe('readGitlabSecrets', () => {
    it('reads a project group and returns raw vault data', async () => {
      const projectSlug = makeProjectSlug()
      server.use(
        http.get(`${vaultUrl}/v1/kv/data/*`, () => {
          return HttpResponse.json({ data: { data: { key1: 'value1', key2: 42, key3: false, key4: null }, metadata: { created_time: '2023-01-01T00:00:00.000Z', version: 1 } } })
        }),
      )

      const result = await service.readGitlabSecrets(projectSlug)

      expect(result).toEqual({ key1: 'value1', key2: 42, key3: false, key4: null })
    })

    it('returns {} when the secret is missing', async () => {
      const projectSlug = makeProjectSlug()
      server.use(
        http.get(`${vaultUrl}/v1/kv/data/*`, () => {
          return HttpResponse.json({}, { status: HttpStatus.NOT_FOUND })
        }),
      )

      const result = await service.readGitlabSecrets(projectSlug)

      expect(result).toEqual({})
    })
  })

  describe('readProjectRobotRegistrySecrets', () => {
    it('reads the project-robot leaf and returns raw vault data', async () => {
      const projectSlug = makeProjectSlug()
      server.use(
        http.get(`${vaultUrl}/v1/kv/data/*`, () => {
          return HttpResponse.json({ data: { data: { HOST: 'harbor.example', USERNAME: 'robot$my-project+project-robot' }, metadata: { created_time: '2023-01-01T00:00:00.000Z', version: 1 } } })
        }),
      )

      const result = await service.readProjectRobotRegistrySecrets(projectSlug)

      expect(result).toEqual({ HOST: 'harbor.example', USERNAME: 'robot$my-project+project-robot' })
    })

    it('returns {} when the robot secret is missing', async () => {
      const projectSlug = makeProjectSlug()
      server.use(
        http.get(`${vaultUrl}/v1/kv/data/*`, () => {
          return HttpResponse.json({}, { status: HttpStatus.NOT_FOUND })
        }),
      )

      const result = await service.readProjectRobotRegistrySecrets(projectSlug)

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
      const projectSlug = makeProjectSlug()
      let capturedPath: string | undefined
      server.use(
        http.post(`${vaultUrl}/v1/kv/data/*`, ({ request }) => {
          capturedPath = new URL(request.url).pathname.replace('/v1/kv/data/', '')
          return HttpResponse.json({})
        }),
      )
      await service.writeMirrorTriggerToken(projectSlug, { PROJECT_SLUG: projectSlug })
      expect(capturedPath).toBe(`forge/${projectSlug}/GITLAB`)
    })
  })

  describe('ensureAuthApproleRoleSecretId', () => {
    it('mints and persists a secret-id on first sync', async () => {
      const projectSlug = makeProjectSlug()
      let minted = false
      let persisted: unknown
      server.use(
        http.get(`${vaultUrl}/v1/kv/data/*`, () => {
          return HttpResponse.json({}, { status: HttpStatus.NOT_FOUND })
        }),
        http.post(`${vaultUrl}/v1/auth/approle/role/*/secret-id`, () => {
          minted = true
          return HttpResponse.json({ data: { secret_id: 'minted-secret' } })
        }),
        http.post(`${vaultUrl}/v1/kv/data/*`, async ({ request }) => {
          persisted = await request.json()
          return HttpResponse.json({})
        }),
      )

      const secretId = await service.ensureAuthApproleRoleSecretId(projectSlug)

      expect(secretId).toBe('minted-secret')
      expect(minted).toBe(true)
      expect(persisted).toEqual({ data: { secret_id: 'minted-secret' } })
    })

    it('reuses a persisted secret-id on subsequent syncs without minting', async () => {
      const projectSlug = makeProjectSlug()
      let minted = false
      server.use(
        http.get(`${vaultUrl}/v1/kv/data/*`, () => {
          return HttpResponse.json({ data: { data: { secret_id: 'persisted-secret' }, metadata: { created_time: '2023-01-01T00:00:00.000Z', version: 1 } } })
        }),
        http.post(`${vaultUrl}/v1/auth/approle/role/*/secret-id`, () => {
          minted = true
          return HttpResponse.json({ data: { secret_id: 'unexpected' } })
        }),
      )

      const secretId = await service.ensureAuthApproleRoleSecretId(projectSlug)

      expect(secretId).toBe('persisted-secret')
      expect(minted).toBe(false)
    })

    it('mints when the persisted entry lacks secret_id', async () => {
      const projectSlug = makeProjectSlug()
      let minted = false
      server.use(
        http.get(`${vaultUrl}/v1/kv/data/*`, () => {
          return HttpResponse.json({ data: { data: {} } })
        }),
        http.post(`${vaultUrl}/v1/auth/approle/role/*/secret-id`, () => {
          minted = true
          return HttpResponse.json({ data: { secret_id: 'fresh-secret' } })
        }),
        http.post(`${vaultUrl}/v1/kv/data/*`, () => HttpResponse.json({})),
      )

      const secretId = await service.ensureAuthApproleRoleSecretId(projectSlug)

      expect(secretId).toBe('fresh-secret')
      expect(minted).toBe(true)
    })
  })

  describe('gitlab mirror credentials', () => {
    it('reads mirror creds and returns null when missing', async () => {
      const projectSlug = makeProjectSlug()
      const repoName = makeRepoName()
      const expected = { username: faker.internet.username(), password: faker.internet.password() }
      server.use(
        http.get(`${vaultUrl}/v1/kv/data/*`, () => {
          return HttpResponse.json({ data: { data: expected, metadata: { created_time: '2023-01-01T00:00:00.000Z', version: 1 } } })
        }),
      )

      await expect(service.readGitlabMirrorCreds(projectSlug, repoName)).resolves.toMatchObject({
        data: expected,
      })

      server.use(
        http.get(`${vaultUrl}/v1/kv/data/*`, () => HttpResponse.json({}, { status: HttpStatus.NOT_FOUND })),
      )
      await expect(service.readGitlabMirrorCreds(projectSlug, repoName)).resolves.toBeNull()
    })

    it('writes mirror creds under the repo-mirror path', async () => {
      const projectSlug = makeProjectSlug()
      const repoName = makeRepoName()
      let capturedPath: string | undefined
      server.use(
        http.post(`${vaultUrl}/v1/kv/data/*`, ({ request }) => {
          capturedPath = new URL(request.url).pathname.replace('/v1/kv/data/', '')
          return HttpResponse.json({})
        }),
      )

      await service.writeGitlabMirrorCreds(projectSlug, repoName, { GIT_INPUT_URL: faker.internet.url(), GIT_INPUT_USER: faker.internet.username(), GIT_INPUT_PASSWORD: faker.internet.password(), GIT_OUTPUT_URL: faker.internet.url(), GIT_OUTPUT_USER: faker.internet.username(), GIT_OUTPUT_PASSWORD: faker.internet.password() })

      expect(capturedPath).toBe(`forge/${projectSlug}/${repoName}-mirror`)
    })

    it('deletes mirror creds and swallows NotFound', async () => {
      const projectSlug = makeProjectSlug()
      const repoName = makeRepoName()
      let capturedPath: string | undefined
      server.use(
        http.delete(`${vaultUrl}/v1/kv/metadata/*`, ({ request }) => {
          capturedPath = new URL(request.url).pathname.replace('/v1/kv/metadata/', '')
          return new HttpResponse(null, { status: HttpStatus.NO_CONTENT })
        }),
      )

      await expect(service.deleteGitlabMirrorCreds(projectSlug, repoName)).resolves.toBeUndefined()
      expect(capturedPath).toBe(`forge/${projectSlug}/${repoName}-mirror`)

      server.use(
        http.delete(`${vaultUrl}/v1/kv/metadata/*`, () => HttpResponse.json({}, { status: HttpStatus.NOT_FOUND })),
      )
      await expect(service.deleteGitlabMirrorCreds(projectSlug, repoName)).resolves.toBeUndefined()
    })
  })

  describe('tech read-only credentials', () => {
    it('reads tech creds and returns null when missing', async () => {
      const projectSlug = makeProjectSlug()
      const expected = { MIRROR_USER: faker.internet.username(), MIRROR_TOKEN: faker.string.alphanumeric(24) }
      server.use(
        http.get(`${vaultUrl}/v1/kv/data/*`, () => {
          return HttpResponse.json({ data: { data: expected, metadata: { created_time: '2023-01-01T00:00:00.000Z', version: 1 } } })
        }),
      )

      await expect(service.readTechnReadOnlyCreds(projectSlug)).resolves.toMatchObject({
        data: expected,
      })

      server.use(
        http.get(`${vaultUrl}/v1/kv/data/*`, () => HttpResponse.json({}, { status: HttpStatus.NOT_FOUND })),
      )
      await expect(service.readTechnReadOnlyCreds(projectSlug)).resolves.toBeNull()
    })

    it('writes tech creds under the tech path', async () => {
      const projectSlug = makeProjectSlug()
      let capturedPath: string | undefined
      server.use(
        http.post(`${vaultUrl}/v1/kv/data/*`, ({ request }) => {
          capturedPath = new URL(request.url).pathname.replace('/v1/kv/data/', '')
          return HttpResponse.json({})
        }),
      )

      await service.writeTechReadOnlyCreds(projectSlug, { MIRROR_USER: faker.internet.username(), MIRROR_TOKEN: faker.string.alphanumeric(24) })

      expect(capturedPath).toBe(`forge/${projectSlug}/tech/GITLAB_MIRROR`)
    })
  })

  describe('sonarqube user credentials', () => {
    it('reads the sonar user and returns null when missing', async () => {
      const projectSlug = makeProjectSlug()
      const expected = { SONAR_USERNAME: faker.internet.username(), SONAR_PASSWORD: faker.internet.password() }
      server.use(
        http.get(`${vaultUrl}/v1/kv/data/*`, () => {
          return HttpResponse.json({ data: { data: expected, metadata: { created_time: '2023-01-01T00:00:00.000Z', version: 1 } } })
        }),
      )

      await expect(service.readSonarqubeUser(projectSlug)).resolves.toMatchObject({
        data: expected,
      })

      server.use(
        http.get(`${vaultUrl}/v1/kv/data/*`, () => HttpResponse.json({}, { status: HttpStatus.NOT_FOUND })),
      )
      await expect(service.readSonarqubeUser(projectSlug)).resolves.toBeNull()
    })

    it('writes the sonar user under the SONAR path', async () => {
      const projectSlug = makeProjectSlug()
      let capturedPath: string | undefined
      server.use(
        http.post(`${vaultUrl}/v1/kv/data/*`, ({ request }) => {
          capturedPath = new URL(request.url).pathname.replace('/v1/kv/data/', '')
          return HttpResponse.json({})
        }),
      )

      await service.writeSonarqubeUser(projectSlug, { SONAR_USERNAME: faker.internet.username(), SONAR_PASSWORD: faker.internet.password(), SONAR_TOKEN: faker.string.alphanumeric(24) })

      expect(capturedPath).toBe(`forge/${projectSlug}/SONAR`)
    })

    it('deletes the sonar user and swallows NotFound', async () => {
      const projectSlug = makeProjectSlug()
      server.use(
        http.delete(`${vaultUrl}/v1/kv/metadata/*`, () => new HttpResponse(null, { status: HttpStatus.NO_CONTENT })),
      )

      await expect(service.deleteSonarqubeUser(projectSlug)).resolves.toBeUndefined()

      server.use(
        http.delete(`${vaultUrl}/v1/kv/metadata/*`, () => HttpResponse.json({}, { status: HttpStatus.NOT_FOUND })),
      )
      await expect(service.deleteSonarqubeUser(projectSlug)).resolves.toBeUndefined()
    })
  })

  describe('kv metadata listing', () => {
    it('lists keys under a metadata path', async () => {
      const projectSlug = makeProjectSlug()
      const repoName = makeRepoName()
      server.use(
        http.all(`${vaultUrl}/v1/kv/metadata/*`, () => {
          return HttpResponse.json({ data: { keys: [repoName, 'repo-two'] } })
        }),
      )

      await expect(service.listKvMetadata('kv', `forge/${projectSlug}`)).resolves.toEqual([repoName, 'repo-two'])
    })

    it('returns an empty list when the path is unknown', async () => {
      server.use(
        http.all(`${vaultUrl}/v1/kv/metadata/*`, () => HttpResponse.json({}, { status: HttpStatus.NOT_FOUND })),
      )

      await expect(service.listKvMetadata('kv', `forge/${faker.string.alphanumeric(8).toLowerCase()}`)).resolves.toEqual([])
    })
  })

  describe('sys policies and mounts', () => {
    it('ensures and deletes an ACL policy', async () => {
      const policyName = faker.string.alphanumeric(8).toLowerCase()
      const calls: { path: string, method: string }[] = []
      server.use(
        http.post(`${vaultUrl}/v1/sys/policies/acl/*`, ({ request }) => {
          calls.push({ path: new URL(request.url).pathname, method: request.method })
          return HttpResponse.json({})
        }),
        http.delete(`${vaultUrl}/v1/sys/policies/acl/*`, ({ request }) => {
          calls.push({ path: new URL(request.url).pathname, method: request.method })
          return new HttpResponse(null, { status: HttpStatus.NO_CONTENT })
        }),
      )

      await service.ensureSysPoliciesAcl(policyName, { policy: 'path "kv/*" { capabilities = ["read"] }' })
      await service.deleteSysPoliciesAcl(policyName)

      expect(calls).toEqual([
        { path: `/v1/sys/policies/acl/${policyName}`, method: 'POST' },
        { path: `/v1/sys/policies/acl/${policyName}`, method: 'DELETE' },
      ])
    })

    it('creates, lists, tunes and deletes a mount', async () => {
      const calls: { path: string, method: string }[] = []
      server.use(
        http.post(`${vaultUrl}/v1/sys/mounts/*`, ({ request }) => {
          calls.push({ path: new URL(request.url).pathname, method: request.method })
          return HttpResponse.json({})
        }),
        http.get(`${vaultUrl}/v1/sys/mounts`, () => {
          return HttpResponse.json({ data: { 'kv/': { type: 'kv', options: { version: '2' } } } })
        }),
        http.delete(`${vaultUrl}/v1/sys/mounts/*`, ({ request }) => {
          calls.push({ path: new URL(request.url).pathname, method: request.method })
          return new HttpResponse(null, { status: HttpStatus.NO_CONTENT })
        }),
      )

      await service.createSysMount('kv', { type: 'kv', config: { force_no_cache: false }, options: { version: 2 } })
      await expect(service.listSysMounts()).resolves.toEqual({ 'kv/': { type: 'kv', options: { version: '2' } } })
      await service.tuneSysMount('kv', { options: { version: 2 } })
      await service.deleteSysMounts('kv')

      expect(calls).toEqual([
        { path: '/v1/sys/mounts/kv', method: 'POST' },
        { path: '/v1/sys/mounts/kv/tune', method: 'POST' },
        { path: '/v1/sys/mounts/kv', method: 'DELETE' },
      ])
    })
  })

  describe('approle role-id', () => {
    it('returns the role-id', async () => {
      const projectSlug = makeProjectSlug()
      const roleId = faker.string.alphanumeric(16)
      server.use(
        http.get(`${vaultUrl}/v1/auth/approle/role/*/role-id`, () => {
          return HttpResponse.json({ data: { role_id: roleId } })
        }),
      )

      await expect(service.getAuthApproleRoleRoleId(projectSlug)).resolves.toBe(roleId)
    })

    it('throws InvalidResponse when the role-id is absent', async () => {
      const projectSlug = makeProjectSlug()
      server.use(
        http.get(`${vaultUrl}/v1/auth/approle/role/*/role-id`, () => HttpResponse.json({ data: {} })),
      )

      await expect(service.getAuthApproleRoleRoleId(projectSlug)).rejects.toMatchObject({
        name: 'VaultError',
        kind: 'InvalidResponse',
      })
    })
  })

  describe('identity groups', () => {
    it('ensures, reads and deletes a group by name', async () => {
      const groupName = faker.string.alphanumeric(8).toLowerCase()
      const policyName = faker.string.alphanumeric(8).toLowerCase()
      const calls: { path: string, method: string }[] = []
      server.use(
        http.post(`${vaultUrl}/v1/identity/group/name/*`, ({ request }) => {
          calls.push({ path: new URL(request.url).pathname, method: request.method })
          return HttpResponse.json({})
        }),
        http.get(`${vaultUrl}/v1/identity/group/name/*`, () => {
          return HttpResponse.json({ data: { name: groupName, policies: [policyName] } })
        }),
        http.delete(`${vaultUrl}/v1/identity/group/name/*`, ({ request }) => {
          calls.push({ path: new URL(request.url).pathname, method: request.method })
          return new HttpResponse(null, { status: HttpStatus.NO_CONTENT })
        }),
      )

      await service.ensureIdentityGroupName(groupName, { name: groupName, type: 'internal', policies: [policyName] })
      await expect(service.getIdentityGroupName(groupName)).resolves.toMatchObject({ data: { name: groupName } })
      await service.deleteIdentityGroupName(groupName)

      expect(calls).toEqual([
        { path: `/v1/identity/group/name/${groupName}`, method: 'POST' },
        { path: `/v1/identity/group/name/${groupName}`, method: 'DELETE' },
      ])
    })

    it('creates a group alias', async () => {
      const aliasName = faker.string.alphanumeric(8).toLowerCase()
      let body: unknown
      server.use(
        http.post(`${vaultUrl}/v1/identity/group-alias`, async ({ request }) => {
          body = await request.json()
          return HttpResponse.json({})
        }),
      )

      await service.createIdentityGroupAlias({ name: aliasName, mount_accessor: 'acc', canonical_id: 'id-1' })

      expect(body).toEqual({ name: aliasName, mount_accessor: 'acc', canonical_id: 'id-1' })
    })
  })
})
