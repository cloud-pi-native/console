import type { ConfigType } from '@nestjs/config'
import type { Cache } from 'cache-manager'
import type { DeepMockProxy } from 'vitest-mock-extended'
import type { PluginService } from '../../core/plugin/plugin.service'
import type { PrismaService } from '../../infrastructure/database/prisma.service'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { harborConfigFactory } from '../../../config/harbor.config'
import { makeToUrlParams } from '../../core/plugin/plugin-testing.utils'
import { makeProjectWithDetails } from '../../core/project/project-testing.utils'
import { SystemConfigService } from '../../core/system-config/system-config.service'
import { VaultClientService } from '../vault/vault-client.service'
import { RegistryClientService } from './registry-client.service'
import { RegistryDatastoreService } from './registry-datastore.service'
import { RegistryPluginService } from './registry-plugin.service'

const ROBOT_DURATIONS_INFO = { 'Durée du robot RO': '60 jours', 'Durée du robot RW': '60 jours', 'Durée du robot projet': 'jamais' } as const

describe('registryPluginService', () => {
  let service: RegistryPluginService
  let datastore: DeepMockProxy<RegistryDatastoreService>
  let registryClient: DeepMockProxy<RegistryClientService>
  let vault: DeepMockProxy<VaultClientService>
  let harborConfig: DeepMockProxy<ConfigType<typeof harborConfigFactory>>
  let cache: { get: ReturnType<typeof vi.fn>, set: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    harborConfig = mockDeep<ConfigType<typeof harborConfigFactory>>({
      url: 'https://harbor.example',
      internalUrl: undefined,
      admin: 'admin',
      adminPassword: 'password',
      ruleTemplate: undefined,
      ruleCount: undefined,
      retentionCron: '0 22 2 * * *',
      robotRotationThresholdDays: 90,
      robotExpirationRoDays: 60,
      robotExpirationRwDays: 60,
      robotExpirationProjectDays: -1,
      projectSlugCacheTtlMs: 300000,
    })
    datastore = mockDeep<RegistryDatastoreService>({
      getAdminPluginConfig: vi.fn().mockResolvedValue(null),
    })
    registryClient = mockDeep<RegistryClientService>({
      getProjectByName: vi.fn().mockResolvedValue({ status: 200, data: { project_id: 123 } }),
    })
    vault = mockDeep<VaultClientService>({
      readProjectRobotRegistrySecrets: vi.fn().mockResolvedValue({}),
    })
    cache = {
      get: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockResolvedValue(undefined),
    }

    const moduleRef = await Test.createTestingModule({
      providers: [
        RegistryPluginService,
        { provide: VaultClientService, useValue: vault },
        { provide: RegistryDatastoreService, useValue: datastore },
        { provide: RegistryClientService, useValue: registryClient },
        { provide: harborConfigFactory.KEY, useValue: harborConfig },
        { provide: CACHE_MANAGER, useValue: cache },
      ],
    }).compile()

    service = moduleRef.get(RegistryPluginService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('exposes configuration without resolving a project or calling Harbor', () => {
    const manifest = service.manifest()
    expect(manifest.config?.global?.map(item => item.key)).toEqual(['publishProjectRobot', 'quotaHardLimit'])
    expect(manifest.to).toBeUndefined()
    expect(datastore.getProject).not.toHaveBeenCalled()
    expect(registryClient.getProjectByName).not.toHaveBeenCalled()
    expect(cache.get).not.toHaveBeenCalled()
  })

  it('reads the robot default saved through the system configuration manifest', async () => {
    const prisma = mockDeep<PrismaService>()
    const catalog = mockDeep<PluginService>()
    const records = new Map<string, string>()
    catalog.manifests.mockReturnValue([service.manifest()])
    prisma.$transaction.mockImplementation(async callback => callback(prisma))
    prisma.adminPlugin.upsert.mockImplementation(async ({ create }) => {
      records.set(`${create.pluginName}:${create.key}`, create.value)
      return { pluginName: create.pluginName, key: create.key, value: create.value }
    })
    prisma.adminPlugin.findUnique.mockImplementation(async ({ where }) => {
      const identity = where.pluginName_key
      if (!identity) throw new Error('Missing configuration identity')
      const value = records.get(`${identity.pluginName}:${identity.key}`)
      return value === undefined ? null : { ...identity, value }
    })
    const configService = new SystemConfigService(prisma, catalog)
    const registry = new RegistryPluginService(harborConfig, new RegistryDatastoreService(prisma), registryClient, mockDeep<Cache>(), vault)

    await configService.update({ [service.manifest().name]: { publishProjectRobot: 'enabled' } })

    expect(await registry.isProjectRobotEnabled({ slug: 'test-project', plugins: [] })).toBe(true)
    expect(records.get('harbor:publishProjectRobot')).toBe('enabled')
    expect(records.has('registry:publishProjectRobot')).toBe(false)
  })

  describe('secrets', () => {
    const baseProject = makeProjectWithDetails({ slug: 'test-project' })

    it('returns the base path alone by default, without reading vault', async () => {
      datastore.getProject.mockResolvedValue(baseProject)

      const result = await service.secrets('test-project-id')

      expect(result).toEqual({ 'Registry base path': 'harbor.example/test-project/', ...ROBOT_DURATIONS_INFO })
      expect(vault.readProjectRobotRegistrySecrets).not.toHaveBeenCalled()
    })

    it('returns the base path alone when the robot is not published', async () => {
      datastore.getProject.mockResolvedValue(makeProjectWithDetails({
        slug: 'test-project',
        plugins: [{ pluginName: 'harbor', key: 'publishProjectRobot', value: 'disabled' }] as never,
      }))
      vault.readProjectRobotRegistrySecrets.mockResolvedValue({})

      const result = await service.secrets('test-project-id')

      expect(result).toEqual({ 'Registry base path': 'harbor.example/test-project/', ...ROBOT_DURATIONS_INFO })
      expect(vault.readProjectRobotRegistrySecrets).not.toHaveBeenCalled()
    })

    it('returns the base path with robot credentials when the robot is published and provisioned', async () => {
      datastore.getProject.mockResolvedValue(makeProjectWithDetails({
        slug: 'test-project',
        plugins: [{ pluginName: 'harbor', key: 'publishProjectRobot', value: 'enabled' }] as never,
      }))
      vault.readProjectRobotRegistrySecrets.mockResolvedValue({ HOST: 'harbor.example', TOKEN: 'tok' })

      const result = await service.secrets('test-project-id')

      expect(result).toEqual({ 'Registry base path': 'harbor.example/test-project/', ...ROBOT_DURATIONS_INFO, HOST: 'harbor.example', TOKEN: 'tok' })
    })

    it('returns the fallback message when the robot is published but missing from Vault', async () => {
      datastore.getProject.mockResolvedValue(makeProjectWithDetails({
        slug: 'test-project',
        plugins: [{ pluginName: 'harbor', key: 'publishProjectRobot', value: 'enabled' }] as never,
      }))
      vault.readProjectRobotRegistrySecrets.mockResolvedValue({})

      const result = await service.secrets('test-project-id')

      expect(result).toEqual({ 'Registry base path': 'harbor.example/test-project/', ...ROBOT_DURATIONS_INFO, '/!\\': 'Vous n\'avez pas de robot de lecture veuillez reprovisionner' })
    })

    it('defaults to the admin config when the project has no robot setting', async () => {
      datastore.getProject.mockResolvedValue(baseProject)
      datastore.getAdminPluginConfig.mockResolvedValue('enabled')
      vault.readProjectRobotRegistrySecrets.mockResolvedValue({ HOST: 'harbor.example' })

      const result = await service.secrets('test-project-id')

      expect(result).toEqual({ 'Registry base path': 'harbor.example/test-project/', ...ROBOT_DURATIONS_INFO, HOST: 'harbor.example' })
    })

    it('defaults to the admin config when the project robot setting is default', async () => {
      datastore.getProject.mockResolvedValue(makeProjectWithDetails({
        slug: 'test-project',
        plugins: [{ pluginName: 'harbor', key: 'publishProjectRobot', value: 'default' }] as never,
      }))
      datastore.getAdminPluginConfig.mockResolvedValue('enabled')
      vault.readProjectRobotRegistrySecrets.mockResolvedValue({ HOST: 'harbor.example' })

      const result = await service.secrets('test-project-id')

      expect(result).toEqual({ 'Registry base path': 'harbor.example/test-project/', ...ROBOT_DURATIONS_INFO, HOST: 'harbor.example' })
    })
  })

  describe('infos', () => {
    const baseProject = makeProjectWithDetails({ slug: 'dulei' })

    it('should expose the legacy project url', async () => {
      datastore.getProject.mockResolvedValue(baseProject)

      const infos = await service.infos('test-project-id')
      const params = makeToUrlParams({ project: { id: '', name: '', slug: 'dulei' }, store: {}, clusters: [], zones: [], environments: [] })
      const url = infos.to(params)

      expect(url).toBe('https://harbor.example/harbor/projects/123/')
    })
  })
})
