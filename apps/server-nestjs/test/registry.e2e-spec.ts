import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { ConfigurationService } from '../src/cpin-module/infrastructure/configuration/configuration.service'
import { RegistryClientService } from '../src/modules/registry/registry-client.service'
import { RegistryModule } from '../src/modules/registry/registry.module'
import { VaultClientService } from '../src/modules/vault/vault-client.service'
import { VaultError } from '../src/modules/vault/vault-http-client.service.js'

describe('RegistryController (e2e)', () => {
  let moduleRef: TestingModule
  let client: RegistryClientService
  let vault: VaultClientService

  beforeAll(async () => {
    const state = {
      projectExists: true,
      retentionId: 456 as number | null,
    }
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input)
      const method = init?.method ?? (input instanceof Request ? input.method : 'GET')
      const json = (status: number, data: unknown) => {
        const headers = new Headers()
        headers.set('content-type', 'application/json')
        return new Response(JSON.stringify(data), { status, headers })
      }
      const noContent = (status: number = 204) => {
        return new Response(null, { status })
      }
      if (url.includes('/api/v2.0/projects/') && url.endsWith('/members') && method === 'GET') {
        return json(200, [{ id: 1, entity_name: '/proj', entity_type: 'g', role_id: 3 }])
      }
      if (url.includes('/api/v2.0/projects/') && url.endsWith('/members') && method === 'POST') {
        return json(201, {})
      }
      if (url.includes('/api/v2.0/projects/') && url.endsWith('/robots') && method === 'GET') {
        return json(200, [])
      }
      if (url.endsWith('/api/v2.0/robots') && method === 'POST') {
        return json(201, { id: Math.floor(Math.random() * 1000), name: 'robot$proj+name', secret: 'secret' })
      }
      if (url.includes('/api/v2.0/robots/') && method === 'DELETE') {
        return noContent(204)
      }
      if (url.includes('/api/v2.0/retentions') && method === 'POST') {
        return json(201, { id: 456 })
      }
      if (url.includes('/api/v2.0/quotas?') && method === 'GET') {
        return json(200, [{ ref: { id: 123 }, hard: { storage: -1 } }])
      }
      if (url.includes('/api/v2.0/projects/') && method === 'GET') {
        if (!state.projectExists) return json(404, {})
        return json(200, { project_id: 123, metadata: { retention_id: state.retentionId } })
      }
      if (url.endsWith('/api/v2.0/projects') && method === 'POST') {
        state.projectExists = true
        return json(201, { project_id: 123 })
      }
      return json(200, {})
    })
    const vaultMock = {
      read: vi.fn().mockRejectedValue(new VaultError('NotFound', 'not found')),
      write: vi.fn(),
      delete: vi.fn(),
    } as unknown as VaultClientService
    moduleRef = await Test.createTestingModule({
      imports: [RegistryModule],
    })
      .overrideProvider(ConfigurationService)
      .useValue({
        harborUrl: 'https://harbor.example',
        harborInternalUrl: 'https://harbor.example',
        harborAdmin: 'admin',
        harborAdminPassword: 'password',
        harborRuleTemplate: 'latestPushedK',
        harborRuleCount: '10',
        harborRetentionCron: '0 22 2 * * *',
        projectRootDir: 'forge',
      } satisfies Partial<ConfigurationService>)
      .overrideProvider(VaultClientService)
      .useValue(vaultMock)
      .compile()
    client = moduleRef.get(RegistryClientService)
    vault = moduleRef.get(VaultClientService)
  })

  afterAll(async () => {
    await moduleRef.close()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('should provision project robots and retention with Vault secret writes', async () => {
    const result = await client.provisionProject('proj', { publishProjectRobot: true })
    expect(result.basePath).toBe('harbor.example/proj/')
    expect(vault.write).toHaveBeenCalledTimes(3)
  })
})
