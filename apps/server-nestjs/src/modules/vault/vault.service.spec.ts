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

const vaultBaseUrl = 'http://vault.test'

const projectRoleGroupNameRegex = /^project-(.*)-(admin|devops|developer|readonly|security)$/

const server = setupServer(
  http.post(`${vaultBaseUrl}/v1/sys/mounts/:name`, () => {
    return HttpResponse.text('', { status: 204 })
  }),
  http.post(`${vaultBaseUrl}/v1/sys/mounts/:name/tune`, () => {
    return HttpResponse.text('', { status: 204 })
  }),
  http.delete(`${vaultBaseUrl}/v1/sys/mounts/:name`, () => {
    return HttpResponse.text('', { status: 204 })
  }),
  http.post(`${vaultBaseUrl}/v1/sys/policies/acl/:policyName`, () => {
    return HttpResponse.text('', { status: 204 })
  }),
  http.delete(`${vaultBaseUrl}/v1/sys/policies/acl/:policyName`, () => {
    return HttpResponse.text('', { status: 204 })
  }),
  http.post(`${vaultBaseUrl}/v1/auth/approle/role/:roleName`, () => {
    return HttpResponse.text('', { status: 204 })
  }),
  http.delete(`${vaultBaseUrl}/v1/auth/approle/role/:roleName`, () => {
    return HttpResponse.text('', { status: 204 })
  }),
  http.post(`${vaultBaseUrl}/v1/identity/group/name/:groupName`, () => {
    return HttpResponse.text('', { status: 204 })
  }),
  http.get(`${vaultBaseUrl}/v1/identity/group/name/:groupName`, ({ params }) => {
    const groupName = String(params.groupName)
    const projectRoleMatch = projectRoleGroupNameRegex.exec(groupName)
    if (projectRoleMatch) {
      const projectSlug = projectRoleMatch[1]
      const role = projectRoleMatch[2]
      return HttpResponse.json({ data: { id: 'gid', name: groupName, alias: { name: `/${projectSlug}/console/${role}` } } })
    }

    if (groupName === 'console-admin') return HttpResponse.json({ data: { id: 'gid', name: groupName, alias: { name: '/console/admin' } } })
    if (groupName === 'console-readonly') return HttpResponse.json({ data: { id: 'gid', name: groupName, alias: { name: '/console/readonly' } } })
    if (groupName === 'console-security') return HttpResponse.json({ data: { id: 'gid', name: groupName, alias: { name: '/console/security' } } })

    return HttpResponse.json({ data: { id: 'gid', name: groupName } })
  }),
  http.delete(`${vaultBaseUrl}/v1/identity/group/name/:groupName`, () => {
    return HttpResponse.text('', { status: 204 })
  }),
  http.get(`${vaultBaseUrl}/v1/sys/auth`, () => {
    return HttpResponse.json({
      data: {
        'oidc/': { accessor: 'oidc-accessor', type: 'oidc' },
      },
    })
  }),
  http.post(`${vaultBaseUrl}/v1/identity/group-alias`, () => {
    return HttpResponse.text('', { status: 204 })
  }),
  http.all(`${vaultBaseUrl}/v1/:kvName/metadata/:path*`, ({ request }) => {
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

    const createSysMountSpy = vi.fn()
    server.use(
      http.post(`${vaultBaseUrl}/v1/sys/mounts/:name`, async ({ params, request }) => {
        expect(request.headers.get('x-vault-token')).toBe('test-token')
        expect(await request.json()).toEqual({
          type: 'kv',
          config: { force_no_cache: true },
          options: { version: 2 },
        })
        createSysMountSpy(String(params.name))
        return HttpResponse.text('', { status: 204 })
      }),
    )

    await service.handleCron()

    expect(datastore.getAllProjects).toHaveBeenCalled()
    expect(datastore.getAllZones).toHaveBeenCalled()

    expect(createSysMountSpy).toHaveBeenCalledTimes(3)
    expect(createSysMountSpy).toHaveBeenCalledWith('project-1')
    expect(createSysMountSpy).toHaveBeenCalledWith('project-2')
    expect(createSysMountSpy).toHaveBeenCalledWith('zone-z1')
  })

  it('should upsert project on event', async () => {
    const createSysMountSpy = vi.fn()
    const upsertPolicySpy = vi.fn()
    const upsertGroupSpy = vi.fn()
    const createGroupAliasSpy = vi.fn()

    server.use(
      http.post(`${vaultBaseUrl}/v1/sys/mounts/:name`, async ({ params, request }) => {
        expect(request.headers.get('x-vault-token')).toBe('test-token')
        createSysMountSpy(String(params.name))
        return HttpResponse.text('', { status: 204 })
      }),
      http.post(`${vaultBaseUrl}/v1/sys/policies/acl/:policyName`, async ({ params, request }) => {
        expect(request.headers.get('x-vault-token')).toBe('test-token')
        upsertPolicySpy(String(params.policyName))
        return HttpResponse.text('', { status: 204 })
      }),
      http.post(`${vaultBaseUrl}/v1/identity/group/name/:groupName`, async ({ params, request }) => {
        expect(request.headers.get('x-vault-token')).toBe('test-token')
        upsertGroupSpy(String(params.groupName))
        return HttpResponse.text('', { status: 204 })
      }),
      http.post(`${vaultBaseUrl}/v1/identity/group-alias`, async ({ request }) => {
        expect(request.headers.get('x-vault-token')).toBe('test-token')
        createGroupAliasSpy()
        return HttpResponse.text('', { status: 204 })
      }),
    )

    await service.handleUpsert({ slug: 'project-1' } as any)

    expect(createSysMountSpy).toHaveBeenCalledWith('project-1')

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
      expect(upsertPolicySpy).toHaveBeenCalledWith(policyName)
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
      expect(upsertGroupSpy).toHaveBeenCalledWith(groupName)
    }

    expect(createGroupAliasSpy).not.toHaveBeenCalled()
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

    const deleteSysMountSpy = vi.fn()
    const deleteSysPolicySpy = vi.fn()
    const deleteApproleSpy = vi.fn()
    const deleteIdentityGroupSpy = vi.fn()
    const listKvMetadataSpy = vi.fn()

    server.use(
      http.delete(`${vaultBaseUrl}/v1/sys/mounts/:name`, async ({ params, request }) => {
        expect(request.headers.get('x-vault-token')).toBe('test-token')
        deleteSysMountSpy(String(params.name))
        return HttpResponse.text('', { status: 204 })
      }),
      http.delete(`${vaultBaseUrl}/v1/sys/policies/acl/:policyName`, async ({ params, request }) => {
        expect(request.headers.get('x-vault-token')).toBe('test-token')
        deleteSysPolicySpy(String(params.policyName))
        return HttpResponse.text('', { status: 204 })
      }),
      http.delete(`${vaultBaseUrl}/v1/auth/approle/role/:roleName`, async ({ params, request }) => {
        expect(request.headers.get('x-vault-token')).toBe('test-token')
        deleteApproleSpy(String(params.roleName))
        return HttpResponse.text('', { status: 204 })
      }),
      http.delete(`${vaultBaseUrl}/v1/identity/group/name/:groupName`, async ({ params, request }) => {
        expect(request.headers.get('x-vault-token')).toBe('test-token')
        deleteIdentityGroupSpy(String(params.groupName))
        return HttpResponse.text('', { status: 204 })
      }),
      http.all(`${vaultBaseUrl}/v1/:kvName/metadata/:path*`, async ({ params, request }) => {
        let relPath = ''
        if (typeof params.path === 'string') relPath = params.path
        else if (Array.isArray(params.path)) relPath = params.path.join('/')

        if (request.method === 'LIST') {
          listKvMetadataSpy(String(params.kvName), relPath)
          return HttpResponse.json({ data: { keys: [] } })
        }
        if (request.method === 'DELETE') return HttpResponse.text('', { status: 204 })
        return HttpResponse.text('Unhandled', { status: 500 })
      }),
    )

    await service.handleDelete(mockProject)

    expect(deleteSysMountSpy).toHaveBeenCalledWith('project-1')
    expect(deleteSysPolicySpy).toHaveBeenCalledWith('app--project-1--admin')
    expect(deleteSysPolicySpy).toHaveBeenCalledWith('tech--project-1--ro')
    expect(deleteSysPolicySpy).toHaveBeenCalledWith('project--project-1--devops')
    expect(deleteSysPolicySpy).toHaveBeenCalledWith('project--project-1--developer')
    expect(deleteSysPolicySpy).toHaveBeenCalledWith('project--project-1--readonly')
    expect(deleteSysPolicySpy).toHaveBeenCalledWith('project--project-1--security')
    expect(deleteApproleSpy).toHaveBeenCalledWith('project-1')
    expect(deleteIdentityGroupSpy).toHaveBeenCalledWith('project-project-1-admin')
    expect(deleteIdentityGroupSpy).toHaveBeenCalledWith('project-project-1-devops')
    expect(deleteIdentityGroupSpy).toHaveBeenCalledWith('project-project-1-developer')
    expect(deleteIdentityGroupSpy).toHaveBeenCalledWith('project-project-1-readonly')
    expect(deleteIdentityGroupSpy).toHaveBeenCalledWith('project-project-1-security')
    expect(listKvMetadataSpy).toHaveBeenCalledWith('kv', 'forge/project-1')
  })
})
