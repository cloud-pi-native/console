import type { ConfigType } from '@nestjs/config'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { baseConfigFactory } from '../../config/base.config'
import { vaultConfigFactory } from '../../config/vault.config'
import { VaultClientService } from './vault-client.service'
import { VaultDatastoreService } from './vault-datastore.service'
import { VaultError } from './vault-http-client.service'
import { makeProjectWithDetails, makeVaultSecret, makeZoneWithDetails } from './vault-testing.utils'
import { VaultService } from './vault.service'

const projectRoleGroupNameRegex = /^project-(.*)-(admin|devops|developer|readonly|security)$/

function httpError(status: number): VaultError {
  return new VaultError('HttpError', 'Request failed', { status })
}

describe('vaultService', () => {
  let service: VaultService
  let datastore: DeepMockProxy<VaultDatastoreService>
  let client: DeepMockProxy<VaultClientService>
  let vaultConfig: DeepMockProxy<ConfigType<typeof vaultConfigFactory>>
  let baseConfig: DeepMockProxy<ConfigType<typeof baseConfigFactory>>

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

    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith(`project--${project.slug}--developer`, {
      policy: `path "${project.slug}/data/*" { capabilities = ["list"] }`,
    })
    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith(`project--${project.slug}--readonly`, {
      policy: `path "${project.slug}/data/*" { capabilities = ["list"] }`,
    })
    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith(`project--${project.slug}--security`, {
      policy: [
        `path "${project.slug}/metadata/*" { capabilities = ["list"] }`,
        `path "transit/keys/${project.slug}/*" { capabilities = ["list"] }`,
      ].join('\n'),
    })
    expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith(`tech--${project.slug}--ro`, {
      policy: `path "forge-dso/data/forge/${project.slug}/REGISTRY/ro-robot" { capabilities = ["read"] }`,
    })
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

  describe('zone lifecycle', () => {
    it('upserts mount, tech policy and approle for a zone', async () => {
      await service.upsertZone('prod')

      expect(client.createSysMount).toHaveBeenCalledWith('zone-prod', expect.objectContaining({ type: 'kv', options: { version: 2 } }))
      expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith('tech--zone-prod--ro', {
        policy: 'path "zone-prod/*" { capabilities = ["read"] }',
      })
      expect(client.upsertAuthApproleRole).toHaveBeenCalledWith('zone-prod', expect.objectContaining({
        token_type: 'batch',
        token_policies: ['tech--zone-prod--ro'],
      }))
    })

    it('falls back to tuning the mount when creation reports 400', async () => {
      client.createSysMount.mockRejectedValue(httpError(400))

      await service.upsertZone('prod')

      expect(client.tuneSysMount).toHaveBeenCalledWith('zone-prod', { options: { version: 2 } })
      expect(client.upsertSysPoliciesAcl).toHaveBeenCalledWith('tech--zone-prod--ro', expect.any(Object))
      expect(client.upsertAuthApproleRole).toHaveBeenCalled()
    })

    it('does not tune and rethrows when creation fails with another status', async () => {
      client.createSysMount.mockRejectedValue(httpError(403))

      await expect(service.upsertZone('prod')).rejects.toSatisfy((error: unknown) =>
        error instanceof VaultError && error.kind === 'HttpError' && error.status === 403)
      expect(client.tuneSysMount).not.toHaveBeenCalled()
      expect(client.upsertSysPoliciesAcl).not.toHaveBeenCalled()
    })

    it('deletes mount, policy and approle for a zone', async () => {
      await service.deleteZone('prod')

      expect(client.deleteSysMounts).toHaveBeenCalledWith('zone-prod')
      expect(client.deleteSysPoliciesAcl).toHaveBeenCalledWith('tech--zone-prod--ro')
      expect(client.deleteAuthApproleRole).toHaveBeenCalledWith('zone-prod')
    })

    it('tolerates NotFound on every zone teardown call', async () => {
      client.deleteSysMounts.mockRejectedValue(new VaultError('NotFound', 'Not Found'))
      client.deleteSysPoliciesAcl.mockRejectedValue(new VaultError('NotFound', 'Not Found'))
      client.deleteAuthApproleRole.mockRejectedValue(new VaultError('NotFound', 'Not Found'))

      await expect(service.deleteZone('prod')).resolves.toBeUndefined()
    })

    it('surfaces a partial failure when a teardown call fails with HttpError', async () => {
      client.deleteAuthApproleRole.mockRejectedValue(httpError(500))

      await expect(service.deleteZone('prod')).rejects.toSatisfy((error: unknown) =>
        error instanceof VaultError && error.kind === 'HttpError' && error.status === 500)
      // mount deletion still happened before the failure surfaced
      expect(client.deleteSysMounts).toHaveBeenCalledWith('zone-prod')
      expect(client.deleteSysPoliciesAcl).toHaveBeenCalledWith('tech--zone-prod--ro')
    })

    it('reports OK plugin results on the zone events', async () => {
      const zone = makeZoneWithDetails({ slug: 'prod' })

      const upsertResult = await service.handleUpsertZone(zone)
      const deleteResult = await service.handleDeleteZone(zone)

      expect(upsertResult.vault.status).toBe('OK')
      expect(deleteResult.vault.status).toBe('OK')
    })
  })

  describe('project secrets cleanup', () => {
    it('lists project secrets recursively across nested folders', async () => {
      client.listKvMetadata.mockImplementation(async (_kvName: string, path: string) => {
        if (path === 'forge/my-project') return ['SONAR', 'envs/']
        if (path === 'forge/my-project/envs') return ['dev/', 'prod/GITLAB']
        if (path === 'forge/my-project/envs/dev') return ['TOKEN']
        return []
      })

      await expect(service.listProjectSecrets('my-project')).resolves.toEqual([
        'SONAR',
        'envs/dev/TOKEN',
        'envs/prod/GITLAB',
      ])
    })

    it('returns [] when the project has no secrets', async () => {
      client.listKvMetadata.mockResolvedValue([])

      await expect(service.listProjectSecrets('my-project')).resolves.toEqual([])
    })

    it('deletes each secret under the full project path', async () => {
      client.listKvMetadata.mockResolvedValue(['SONAR', 'GITLAB'])

      await service.deleteProjectSecrets('my-project')

      expect(client.delete).toHaveBeenCalledWith('forge/my-project/SONAR')
      expect(client.delete).toHaveBeenCalledWith('forge/my-project/GITLAB')
    })

    it('tolerates NotFound on individual secret deletes', async () => {
      client.listKvMetadata.mockResolvedValue(['SONAR'])
      client.delete.mockRejectedValue(new VaultError('NotFound', 'Not Found'))

      await expect(service.deleteProjectSecrets('my-project')).resolves.toBeUndefined()
    })

    // ponytail-bug: Promise.allSettled results are never inspected in
    // deleteProjectSecrets, so a partial batch failure (e.g. HttpError 500) resolves
    // successfully and the hook reports OK. Legacy fail-fast propagated the first error
    // and returned KO (plugins/vault/src/functions.ts:37 archiveDsoProject).
    it('silently swallows a partial batch delete failure', async () => {
      client.listKvMetadata.mockResolvedValue(['SONAR', 'GITLAB'])
      client.delete.mockImplementation(async (path: string) => {
        if (path === 'forge/my-project/GITLAB') throw httpError(500)
      })

      await expect(service.deleteProjectSecrets('my-project')).resolves.toBeUndefined()
    })
  })
})
