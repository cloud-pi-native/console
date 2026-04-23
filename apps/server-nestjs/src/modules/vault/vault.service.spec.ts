import type { TestingModule } from '@nestjs/testing'
import type { Mocked } from 'vitest'
import type { ProjectWithDetails, ZoneWithDetails } from './vault-datastore.service'
import { Test } from '@nestjs/testing'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigurationService } from '../../cpin-module/infrastructure/configuration/configuration.service'
import { VaultClientService } from './vault-client.service'
import { VaultDatastoreService } from './vault-datastore.service'
import { VaultHttpClientService } from './vault-http-client.service'
import { VaultService } from './vault.service'

const projectRoleGroupNameRegex = /^project-(.*)-(admin|devops|developer|readonly|security)$/

const vaultBaseUrl = 'http://vault.test'

interface VaultRequestLogEntry {
  method: string
  url: string
  path: string
  body: unknown
  token: string | null
}

const requestLog: VaultRequestLogEntry[] = []

function vaultRequestLogEntry(request: Request, path: string, body: unknown): VaultRequestLogEntry {
  return {
    method: request.method,
    url: request.url,
    path,
    body,
    token: request.headers.get('x-vault-token'),
  }
}

function vaultIdentityGroupResponse(groupName: string) {
  const projectRoleMatch = groupName.match(projectRoleGroupNameRegex)
  if (projectRoleMatch) {
    const projectSlug = projectRoleMatch[1]
    const role = projectRoleMatch[2]
    return { data: { id: 'gid', name: groupName, alias: { name: `/${projectSlug}/console/${role}` } } }
  }

  if (groupName === 'console-admin') return { data: { id: 'gid', name: groupName, alias: { name: '/console/admin' } } }
  if (groupName === 'console-readonly') return { data: { id: 'gid', name: groupName, alias: { name: '/console/readonly' } } }
  if (groupName === 'console-security') return { data: { id: 'gid', name: groupName, alias: { name: '/console/security' } } }

  return { data: { id: 'gid', name: groupName } }
}

const server = setupServer(
  http.post(`${vaultBaseUrl}/v1/sys/mounts/:name`, async ({ params, request }) => {
    const body = await request.json().catch(() => undefined)
    requestLog.push(vaultRequestLogEntry(request, `/v1/sys/mounts/${params.name}`, body))
    return HttpResponse.text('', { status: 204 })
  }),
  http.post(`${vaultBaseUrl}/v1/sys/mounts/:name/tune`, async ({ params, request }) => {
    const body = await request.json().catch(() => undefined)
    requestLog.push(vaultRequestLogEntry(request, `/v1/sys/mounts/${params.name}/tune`, body))
    return HttpResponse.text('', { status: 204 })
  }),
  http.delete(`${vaultBaseUrl}/v1/sys/mounts/:name`, ({ params, request }) => {
    requestLog.push(vaultRequestLogEntry(request, `/v1/sys/mounts/${params.name}`, undefined))
    return HttpResponse.text('', { status: 204 })
  }),
  http.post(`${vaultBaseUrl}/v1/sys/policies/acl/:policyName`, async ({ params, request }) => {
    const body = await request.json().catch(() => undefined)
    requestLog.push(vaultRequestLogEntry(request, `/v1/sys/policies/acl/${params.policyName}`, body))
    return HttpResponse.text('', { status: 204 })
  }),
  http.delete(`${vaultBaseUrl}/v1/sys/policies/acl/:policyName`, ({ params, request }) => {
    requestLog.push(vaultRequestLogEntry(request, `/v1/sys/policies/acl/${params.policyName}`, undefined))
    return HttpResponse.text('', { status: 204 })
  }),
  http.post(`${vaultBaseUrl}/v1/auth/approle/role/:roleName`, async ({ params, request }) => {
    const body = await request.json().catch(() => undefined)
    requestLog.push(vaultRequestLogEntry(request, `/v1/auth/approle/role/${params.roleName}`, body))
    return HttpResponse.text('', { status: 204 })
  }),
  http.delete(`${vaultBaseUrl}/v1/auth/approle/role/:roleName`, ({ params, request }) => {
    requestLog.push(vaultRequestLogEntry(request, `/v1/auth/approle/role/${params.roleName}`, undefined))
    return HttpResponse.text('', { status: 204 })
  }),
  http.post(`${vaultBaseUrl}/v1/identity/group/name/:groupName`, async ({ params, request }) => {
    const body = await request.json().catch(() => undefined)
    requestLog.push(vaultRequestLogEntry(request, `/v1/identity/group/name/${params.groupName}`, body))
    return HttpResponse.text('', { status: 204 })
  }),
  http.get(`${vaultBaseUrl}/v1/identity/group/name/:groupName`, ({ params, request }) => {
    requestLog.push(vaultRequestLogEntry(request, `/v1/identity/group/name/${params.groupName}`, undefined))
    return HttpResponse.json(vaultIdentityGroupResponse(String(params.groupName)))
  }),
  http.delete(`${vaultBaseUrl}/v1/identity/group/name/:groupName`, ({ params, request }) => {
    requestLog.push(vaultRequestLogEntry(request, `/v1/identity/group/name/${params.groupName}`, undefined))
    return HttpResponse.text('', { status: 204 })
  }),
  http.get(`${vaultBaseUrl}/v1/sys/auth`, ({ request }) => {
    requestLog.push(vaultRequestLogEntry(request, '/v1/sys/auth', undefined))
    return HttpResponse.json({
      data: {
        'oidc/': { accessor: 'oidc-accessor', type: 'oidc' },
      },
    })
  }),
  http.post(`${vaultBaseUrl}/v1/identity/group-alias`, async ({ request }) => {
    const body = await request.json().catch(() => undefined)
    requestLog.push(vaultRequestLogEntry(request, '/v1/identity/group-alias', body))
    return HttpResponse.text('', { status: 204 })
  }),
  http.all(`${vaultBaseUrl}/v1/:kvName/metadata/:path*`, async ({ params, request }) => {
    let relPath = ''
    if (typeof params.path === 'string') relPath = params.path
    else if (Array.isArray(params.path)) relPath = params.path.join('/')

    requestLog.push(vaultRequestLogEntry(request, `/v1/${params.kvName}/metadata/${relPath}`, undefined))

    if (request.method === 'LIST') {
      return HttpResponse.json({ data: { keys: [] } })
    }
    if (request.method === 'DELETE') {
      return HttpResponse.text('', { status: 204 })
    }
    return HttpResponse.text('Unhandled', { status: 500 })
  }),
)

function createVaultControllerServiceTestingModule() {
  return Test.createTestingModule({
    providers: [
      VaultService,
      VaultClientService,
      VaultHttpClientService,
      {
        provide: VaultDatastoreService,
        useValue: {
          getAllProjects: vi.fn(),
          getAllZones: vi.fn(),
          getAdminPluginConfig: vi.fn(),
        } satisfies Partial<VaultDatastoreService>,
      },
      {
        provide: ConfigurationService,
        useValue: {
          vaultToken: 'test-token',
          vaultUrl: vaultBaseUrl,
          projectRootDir: 'forge',
          vaultKvName: 'kv',
          getInternalOrPublicVaultUrl: () => vaultBaseUrl,
        } satisfies Partial<ConfigurationService>,
      },
    ],
  })
}

describe('vaultService', () => {
  let service: VaultService
  let datastore: Mocked<VaultDatastoreService>

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' })
  })

  beforeEach(async () => {
    requestLog.length = 0
    const module: TestingModule = await createVaultControllerServiceTestingModule().compile()
    service = module.get(VaultService)
    datastore = module.get(VaultDatastoreService)

    datastore.getAdminPluginConfig.mockResolvedValue(null)
  })

  afterEach(() => {
    server.resetHandlers()
  })

  afterAll(() => {
    server.close()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should reconcile on cron', async () => {
    const mockProjects = [
      {
        slug: 'project-1',
        name: 'Project 1',
        id: '550e8400-e29b-41d4-a716-446655440000',
        description: '',
        plugins: [],
        environments: [],
      },
      {
        slug: 'project-2',
        name: 'Project 2',
        id: '660e8400-e29b-41d4-a716-446655440001',
        description: '',
        plugins: [],
        environments: [],
      },
    ] satisfies ProjectWithDetails[]
    const mockZones = [
      { slug: 'z1', id: 'z1' },
    ] satisfies ZoneWithDetails[]

    datastore.getAllProjects.mockResolvedValue(mockProjects)
    datastore.getAllZones.mockResolvedValue(mockZones as any)

    await service.handleCron()

    expect(datastore.getAllProjects).toHaveBeenCalled()
    expect(datastore.getAllZones).toHaveBeenCalled()

    const createMountRequests = requestLog.filter(r => r.method === 'POST' && r.path.startsWith('/v1/sys/mounts/') && !r.path.endsWith('/tune'))
    expect(createMountRequests).toHaveLength(3)
    expect(createMountRequests.map(r => r.path)).toEqual(expect.arrayContaining([
      '/v1/sys/mounts/project-1',
      '/v1/sys/mounts/project-2',
      '/v1/sys/mounts/zone-z1',
    ]))
    for (const req of createMountRequests) {
      expect(req.token).toBe('test-token')
      expect(req.body).toEqual({
        type: 'kv',
        config: { force_no_cache: true },
        options: { version: 2 },
      })
    }
  })

  it('should upsert project on event', async () => {
    await service.handleUpsert({ slug: 'project-1' } as any)

    expect(requestLog.some(r => r.method === 'POST' && r.path === '/v1/sys/mounts/project-1')).toBe(true)

    const expectedPolicyUpserts = [
      'app--project-1--admin',
      'tech--project-1--ro',
      'project--project-1--devops',
      'project--project-1--developer',
      'project--project-1--readonly',
      'project--project-1--security',
      'platform--admin',
      'platform--readonly',
      'platform--security',
    ]
    for (const policyName of expectedPolicyUpserts) {
      expect(requestLog.some(r => r.method === 'POST' && r.path === `/v1/sys/policies/acl/${policyName}`)).toBe(true)
    }

    const expectedGroupUpserts = [
      'console-admin',
      'console-readonly',
      'console-security',
      'project-project-1-admin',
      'project-project-1-devops',
      'project-project-1-developer',
      'project-project-1-readonly',
      'project-project-1-security',
    ]
    for (const groupName of expectedGroupUpserts) {
      expect(requestLog.some(r => r.method === 'POST' && r.path === `/v1/identity/group/name/${groupName}`)).toBe(true)
    }

    expect(requestLog.some(r => r.method === 'POST' && r.path === '/v1/identity/group-alias')).toBe(false)
  })

  it('should delete project and destroy secrets on event', async () => {
    const mockProject = {
      slug: 'project-1',
      name: 'Project 1',
      id: '550e8400-e29b-41d4-a716-446655440000',
      description: '',
      plugins: [],
      environments: [],
    } satisfies ProjectWithDetails

    await service.handleDelete(mockProject)

    const deletePaths = requestLog.filter(r => r.method === 'DELETE').map(r => r.path)

    expect(deletePaths).toEqual(expect.arrayContaining([
      '/v1/sys/mounts/project-1',
      '/v1/sys/policies/acl/app--project-1--admin',
      '/v1/sys/policies/acl/tech--project-1--ro',
      '/v1/sys/policies/acl/project--project-1--devops',
      '/v1/sys/policies/acl/project--project-1--developer',
      '/v1/sys/policies/acl/project--project-1--readonly',
      '/v1/sys/policies/acl/project--project-1--security',
      '/v1/auth/approle/role/project-1',
      '/v1/identity/group/name/project-project-1-admin',
      '/v1/identity/group/name/project-project-1-devops',
      '/v1/identity/group/name/project-project-1-developer',
      '/v1/identity/group/name/project-project-1-readonly',
      '/v1/identity/group/name/project-project-1-security',
    ]))
  })
})
