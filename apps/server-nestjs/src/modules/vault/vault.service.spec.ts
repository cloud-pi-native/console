import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { VaultClientService } from './vault-client.service'
import { VaultDatastoreService } from './vault-datastore.service'
import { makeProjectWithDetails, makeVaultSecret, makeZoneWithDetails } from './vault-testing.utils'
import { VaultService } from './vault.service'

const projectRoleGroupNameRegex = /^project-(.*)-(admin|devops|developer|readonly|security)$/

describe('vaultService', () => {
  let service: VaultService
  let datastore: DeepMockProxy<VaultDatastoreService>
  let client: DeepMockProxy<VaultClientService>
  let config: DeepMockProxy<ConfigurationService>

  beforeEach(async () => {
    datastore = mockDeep<VaultDatastoreService>({
      getAdminPluginConfig: vi.fn().mockResolvedValue(null),
    })
    client = mockDeep<VaultClientService>({
      createSysMount: vi.fn().mockResolvedValue(undefined),
      tuneSysMount: vi.fn().mockResolvedValue(undefined),
      deleteSysMounts: vi.fn().mockResolvedValue(undefined),
      upsertSysPoliciesAcl: vi.fn().mockResolvedValue(undefined),
      deleteSysPoliciesAcl: vi.fn().mockResolvedValue(undefined),
      upsertAuthApproleRole: vi.fn().mockResolvedValue(undefined),
      deleteAuthApproleRole: vi.fn().mockResolvedValue(undefined),
      getIdentityGroupName: vi.fn(async (groupName: string) => makeVaultSecret({ data: { id: 'gid', name: groupName } })),
      deleteIdentityGroupName: vi.fn().mockResolvedValue(undefined),
      getSysAuth: vi.fn().mockResolvedValue({ 'oidc/': { accessor: 'oidc-accessor', type: 'oidc' } }),
      createIdentityGroupAlias: vi.fn().mockResolvedValue(undefined),
      listKvMetadata: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(undefined),
    })
    config = mockDeep<ConfigurationService>({
      projectRootDir: 'forge',
      vaultKvName: 'kv',
    })

    const module = await Test.createTestingModule({
      providers: [
        VaultService,
        { provide: VaultClientService, useValue: client },
        { provide: VaultDatastoreService, useValue: datastore },
        { provide: ConfigurationService, useValue: config },
      ],
    }).compile()

    service = module.get(VaultService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should reconcile on cron', async () => {
    const projects = faker.helpers.multiple(() => makeProjectWithDetails())
    const zones = faker.helpers.multiple(() => makeZoneWithDetails())

    datastore.getAutoSyncProjects.mockResolvedValue(projects)
    datastore.getAutoSyncZones.mockResolvedValue(zones)

    await service.handleCron()

    expect(datastore.getAutoSyncProjects).toHaveBeenCalled()
    expect(datastore.getAutoSyncZones).toHaveBeenCalled()
    expect(client.createSysMount).toHaveBeenCalledTimes(projects.length + zones.length)
    projects.forEach((project) => {
      expect(client.createSysMount).toHaveBeenCalledWith(project.slug, expect.any(Object))
    })
    zones.forEach((zone) => {
      expect(client.createSysMount).toHaveBeenCalledWith(`zone-${zone.slug}`, expect.any(Object))
    })
  })

  it('should upsert project on event', async () => {
    const project = makeProjectWithDetails()

    client.getIdentityGroupName.mockImplementation(async (groupName: string) => {
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
    })

    await service.handleUpsert(project)

    expect(client.createSysMount).toHaveBeenCalledWith(project.slug, expect.any(Object))
    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith(`app--${project.slug}--admin`, expect.any(Object))
    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith(`tech--${project.slug}--ro`, expect.any(Object))
    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith(`project--${project.slug}--devops`, expect.any(Object))
    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith(`project--${project.slug}--developer`, expect.any(Object))
    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith(`project--${project.slug}--readonly`, expect.any(Object))
    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith(`project--${project.slug}--security`, expect.any(Object))
    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith('platform--admin', expect.any(Object))
    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith('platform--readonly', expect.any(Object))
    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith('platform--security', expect.any(Object))
    expect(client.upsertIdentityGroupName).toHaveBeenCalledWith('console-admin', expect.any(Object))
    expect(client.upsertIdentityGroupName).toHaveBeenCalledWith('console-readonly', expect.any(Object))
    expect(client.upsertIdentityGroupName).toHaveBeenCalledWith('console-security', expect.any(Object))
    expect(client.upsertIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-admin`, expect.any(Object))
    expect(client.upsertIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-devops`, expect.any(Object))
    expect(client.upsertIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-developer`, expect.any(Object))
    expect(client.upsertIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-readonly`, expect.any(Object))
    expect(client.upsertIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-security`, expect.any(Object))
    expect(client.createIdentityGroupAlias).not.toHaveBeenCalled()

    const policyCalls = client.upsertSysPoliciesAcl.mock.calls as Array<[string, { policy: string }]>
    expect(policyCalls.find(([name]) => name === `project--${project.slug}--developer`)?.[1].policy)
      .toBe(`path "${project.slug}/data/*" { capabilities = ["list"] }`)
    expect(policyCalls.find(([name]) => name === `project--${project.slug}--readonly`)?.[1].policy)
      .toBe(`path "${project.slug}/data/*" { capabilities = ["list"] }`)
    expect(policyCalls.find(([name]) => name === `project--${project.slug}--security`)?.[1].policy)
      .toBe([
        `path "${project.slug}/metadata/*" { capabilities = ["list"] }`,
        `path "transit/keys/${project.slug}/*" { capabilities = ["list"] }`,
      ].join('\n'))
  })

  it('should delete project and destroy secrets on event', async () => {
    const project = makeProjectWithDetails()

    await service.handleDelete(project)

    expect(client.deleteSysMounts).toHaveBeenCalledWith(project.slug)
    expect(client.deleteSysPoliciesAcl).toHaveBeenCalledWith(`app--${project.slug}--admin`)
    expect(client.deleteSysPoliciesAcl).toHaveBeenCalledWith(`tech--${project.slug}--ro`)
    expect(client.deleteSysPoliciesAcl).toHaveBeenCalledWith(`project--${project.slug}--devops`)
    expect(client.deleteSysPoliciesAcl).toHaveBeenCalledWith(`project--${project.slug}--developer`)
    expect(client.deleteSysPoliciesAcl).toHaveBeenCalledWith(`project--${project.slug}--readonly`)
    expect(client.deleteSysPoliciesAcl).toHaveBeenCalledWith(`project--${project.slug}--security`)
    expect(client.deleteAuthApproleRole).toHaveBeenCalledWith(project.slug)
    expect(client.deleteIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-admin`)
    expect(client.deleteIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-devops`)
    expect(client.deleteIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-developer`)
    expect(client.deleteIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-readonly`)
    expect(client.deleteIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-security`)
  })
})
