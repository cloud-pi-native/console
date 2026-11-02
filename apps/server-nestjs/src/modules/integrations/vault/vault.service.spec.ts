import type { ConfigType } from '@nestjs/config'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { baseConfigFactory } from '../../../config/base.config'
import { vaultConfigFactory } from '../../../config/vault.config'
import { VaultClientService } from './vault-client.service'
import { VaultDatastoreService } from './vault-datastore.service'
import { makeProjectWithDetails, makeZoneWithDetails } from './vault-testing.utils'
import { VaultService } from './vault.service'

interface FakeIdentityGroup {
  id: string
  policies: string[]
  alias?: string
}

type FakeIdentityStore = ReturnType<typeof installFakeIdentityStore>

/**
 * Minimal in-memory model of the Vault identity store. It reproduces the
 * constraint that broke the owner alias: a group carries a single alias per
 * auth mount, so a second `identity/group-alias` POST on the same group
 * replaces the previous alias instead of adding to it.
 */
function installFakeIdentityStore(client: DeepMockProxy<VaultClientService>) {
  const groups = new Map<string, FakeIdentityGroup>()
  let groupCount = 0

  client.ensureIdentityGroupName.mockImplementation(async (groupName, body) => {
    const group = groups.get(groupName)
    if (group) {
      group.policies = body.policies
      return
    }
    groupCount += 1
    groups.set(groupName, { id: `gid-${groupCount}`, policies: body.policies })
  })

  client.getIdentityGroupName.mockImplementation(async (groupName) => {
    const group = groups.get(groupName)
    if (!group) return { data: { id: '', name: groupName } }
    return { data: { id: group.id, name: groupName, ...(group.alias === undefined ? {} : { alias: { name: group.alias } }) } }
  })

  client.createIdentityGroupAlias.mockImplementation(async ({ name, canonical_id }) => {
    for (const group of groups.values()) {
      if (group.alias === name) group.alias = undefined
    }
    const target = [...groups.values()].find(group => group.id === canonical_id)
    if (!target) throw new Error(`Unknown Vault identity group canonical id: ${canonical_id}`)
    target.alias = name
  })

  return {
    groupNameByAlias: (aliasName: string) => [...groups.entries()].find(([, group]) => group.alias === aliasName)?.[0],
    policiesOf: (groupName: string) => groups.get(groupName)?.policies,
  }
}

describe('vaultService', () => {
  let service: VaultService
  let datastore: DeepMockProxy<VaultDatastoreService>
  let client: DeepMockProxy<VaultClientService>
  let identityStore: FakeIdentityStore
  let vaultConfig: DeepMockProxy<ConfigType<typeof vaultConfigFactory>>
  let baseConfig: DeepMockProxy<ConfigType<typeof baseConfigFactory>>

  beforeEach(async () => {
    datastore = mockDeep<VaultDatastoreService>({
      getAdminPluginConfig: vi.fn().mockResolvedValue(null),
    })
    client = mockDeep<VaultClientService>({
      listSysMounts: vi.fn().mockResolvedValue({}),
      createSysMount: vi.fn().mockResolvedValue(undefined),
      tuneSysMount: vi.fn().mockResolvedValue(undefined),
      deleteSysMounts: vi.fn().mockResolvedValue(undefined),
      ensureSysPoliciesAcl: vi.fn().mockResolvedValue(undefined),
      deleteSysPoliciesAcl: vi.fn().mockResolvedValue(undefined),
      ensureAuthApproleRole: vi.fn().mockResolvedValue(undefined),
      deleteAuthApproleRole: vi.fn().mockResolvedValue(undefined),
      getSysAuth: vi.fn().mockResolvedValue({ 'oidc/': { accessor: 'oidc-accessor', type: 'oidc' } }),
      createIdentityGroupAlias: vi.fn().mockResolvedValue(undefined),
      listKvMetadata: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(undefined),
    })
    identityStore = installFakeIdentityStore(client)

    vaultConfig = mockDeep<ConfigType<typeof vaultConfigFactory>>({ kvName: 'forge-dso' })
    baseConfig = mockDeep<ConfigType<typeof baseConfigFactory>>({ projectsRootDir: 'forge' })

    const module = await Test.createTestingModule({
      providers: [
        VaultService,
        { provide: VaultClientService, useValue: client },
        { provide: VaultDatastoreService, useValue: datastore },
        { provide: vaultConfigFactory.KEY, useValue: vaultConfig },
        { provide: baseConfigFactory.KEY, useValue: baseConfig },
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

    datastore.getAllProjects.mockResolvedValue(projects)
    datastore.getAllZones.mockResolvedValue(zones)

    await service.handleCron()

    expect(datastore.getAllProjects).toHaveBeenCalled()
    expect(datastore.getAllZones).toHaveBeenCalled()
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

    await service.handleUpsert(project)

    expect(client.createSysMount).toHaveBeenCalledWith(project.slug, expect.any(Object))
    expect(client.ensureSysPoliciesAcl).toHaveBeenCalledWith(`app--${project.slug}--admin`, expect.any(Object))
    expect(client.ensureSysPoliciesAcl).toHaveBeenCalledWith(`tech--${project.slug}--ro`, expect.any(Object))
    expect(client.ensureSysPoliciesAcl).toHaveBeenCalledWith(`project--${project.slug}--devops`, expect.any(Object))
    expect(client.ensureSysPoliciesAcl).toHaveBeenCalledWith(`project--${project.slug}--developer`, expect.any(Object))
    expect(client.ensureSysPoliciesAcl).toHaveBeenCalledWith(`project--${project.slug}--readonly`, expect.any(Object))
    expect(client.ensureSysPoliciesAcl).toHaveBeenCalledWith(`project--${project.slug}--security`, expect.any(Object))
    expect(client.ensureSysPoliciesAcl).toHaveBeenCalledWith('platform--admin', expect.any(Object))
    expect(client.ensureSysPoliciesAcl).toHaveBeenCalledWith('platform--readonly', expect.any(Object))
    expect(client.ensureSysPoliciesAcl).toHaveBeenCalledWith('platform--security', expect.any(Object))
    expect(client.ensureIdentityGroupName).toHaveBeenCalledWith('console-admin', expect.any(Object))
    expect(client.ensureIdentityGroupName).toHaveBeenCalledWith('console-readonly', expect.any(Object))
    expect(client.ensureIdentityGroupName).toHaveBeenCalledWith('console-security', expect.any(Object))
    expect(client.ensureIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-admin`, expect.any(Object))
    expect(client.ensureIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-devops`, expect.any(Object))
    expect(client.ensureIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-developer`, expect.any(Object))
    expect(client.ensureIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-readonly`, expect.any(Object))
    expect(client.ensureIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-security`, expect.any(Object))
    expect(client.ensureIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-admin-console-owner`, expect.any(Object))
    expect(client.createIdentityGroupAlias).toHaveBeenCalledWith(expect.objectContaining({
      name: `/${project.slug}/console/owner`,
    }))

    expect(client.ensureSysPoliciesAcl).toHaveBeenCalledWith(`project--${project.slug}--developer`, {
      policy: `path "${project.slug}/data/*" { capabilities = ["list"] }`,
    })
    expect(client.ensureSysPoliciesAcl).toHaveBeenCalledWith(`project--${project.slug}--readonly`, {
      policy: `path "${project.slug}/data/*" { capabilities = ["list"] }`,
    })
    expect(client.ensureSysPoliciesAcl).toHaveBeenCalledWith(`project--${project.slug}--security`, {
      policy: [
        `path "${project.slug}/metadata/*" { capabilities = ["list"] }`,
        `path "transit/keys/${project.slug}/*" { capabilities = ["list"] }`,
      ].join('\n'),
    })
    expect(client.ensureSysPoliciesAcl).toHaveBeenCalledWith(`tech--${project.slug}--ro`, {
      policy: `path "forge-dso/data/forge/${project.slug}/REGISTRY/ro-robot" { capabilities = ["read"] }`,
    })
  })

  it('should keep a distinct Vault identity group per alias path', async () => {
    const project = makeProjectWithDetails()

    await service.handleUpsert(project)

    const adminGroupName = `project-${project.slug}-admin`
    const ownerGroupName = `project-${project.slug}-admin-console-owner`
    expect(identityStore.groupNameByAlias(`/${project.slug}/console/admin`)).toBe(adminGroupName)
    expect(identityStore.groupNameByAlias(`/${project.slug}/console/owner`)).toBe(ownerGroupName)
    expect(identityStore.policiesOf(adminGroupName)).toEqual([`app--${project.slug}--admin`])
    expect(identityStore.policiesOf(ownerGroupName)).toEqual([`app--${project.slug}--admin`])
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
    expect(client.deleteIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-admin-console-owner`)
    expect(client.deleteIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-devops`)
    expect(client.deleteIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-developer`)
    expect(client.deleteIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-readonly`)
    expect(client.deleteIdentityGroupName).toHaveBeenCalledWith(`project-${project.slug}-security`)
  })

  it('should create the mount when absent on project upsert', async () => {
    const project = makeProjectWithDetails()

    await service.handleUpsert(project)

    expect(client.listSysMounts).toHaveBeenCalledWith()
    expect(client.createSysMount).toHaveBeenCalledWith(project.slug, {
      type: 'kv',
      config: {
        force_no_cache: true,
      },
      options: {
        version: 2,
      },
    })
    expect(client.tuneSysMount).not.toHaveBeenCalled()
  })

  it('should tune the mount without creating it when it already exists on project upsert', async () => {
    const project = makeProjectWithDetails()
    client.listSysMounts.mockResolvedValue({ [`${project.slug}/`]: { accessor: `kv-${project.slug}`, type: 'kv' } })

    await service.handleUpsert(project)

    expect(client.createSysMount).not.toHaveBeenCalled()
    expect(client.tuneSysMount).toHaveBeenCalledWith(project.slug, {
      options: {
        version: 2,
      },
    })
  })

  it('should destroy the mirror secrets of repositories removed from the project on upsert', async () => {
    const project = makeProjectWithDetails({
      repositories: [
        { id: 'r2', internalRepoName: 'repo-2' },
      ],
    })
    client.listKvMetadata.mockResolvedValue(['repo-1-mirror', 'repo-2-mirror', 'SONAR'])

    await service.handleUpsert(project)

    expect(client.listKvMetadata).toHaveBeenCalledWith('forge-dso', `forge/${project.slug}`)
    expect(client.deleteGitlabMirrorCreds).toHaveBeenCalledTimes(1)
    expect(client.deleteGitlabMirrorCreds).toHaveBeenCalledWith(project.slug, 'repo-1')
  })
})
