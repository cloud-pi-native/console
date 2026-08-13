import type { ConfigType } from '@nestjs/config'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { baseConfigFactory } from '../../config/base.config'
import { gitlabConfigFactory } from '../../config/gitlab.config'
import { harborConfigFactory } from '../../config/harbor.config'
import { nexusConfigFactory } from '../../config/nexus.config'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { VaultClientService } from '../vault/vault-client.service'
import { VaultService } from '../vault/vault.service'
import { makeAdminPlugin, makeProject, makeVaultSecret } from './project-secrets-testing.utils'
import { ProjectSecretsService } from './project-secrets.service'

describe('projectSecretsService', () => {
  let service: ProjectSecretsService
  let prisma: DeepMockProxy<PrismaService>
  let vault: DeepMockProxy<VaultService>
  let vaultClient: DeepMockProxy<VaultClientService>

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>()
    vault = mockDeep<VaultService>()
    vaultClient = mockDeep<VaultClientService>()
    prisma.adminPlugin.findUnique.mockResolvedValue(null)

    const baseConfig = mockDeep<ConfigType<typeof baseConfigFactory>>({ projectsRootDir: 'forge' })
    const gitlabConfig = mockDeep<ConfigType<typeof gitlabConfigFactory>>({ url: 'https://gitlab.example.com' })
    const harborConfig = mockDeep<ConfigType<typeof harborConfigFactory>>({ url: 'https://harbor.example.com' })
    const nexusConfig = mockDeep<ConfigType<typeof nexusConfigFactory>>({
      url: 'https://nexus.example.com',
      internalUrl: undefined,
      secretExposeInternalUrl: false,
    })

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProjectSecretsService,
        { provide: PrismaService, useValue: prisma },
        { provide: baseConfigFactory.KEY, useValue: baseConfig },
        { provide: gitlabConfigFactory.KEY, useValue: gitlabConfig },
        { provide: harborConfigFactory.KEY, useValue: harborConfig },
        { provide: nexusConfigFactory.KEY, useValue: nexusConfig },
        { provide: VaultService, useValue: vault },
        { provide: VaultClientService, useValue: vaultClient },
      ],
    }).compile()

    service = moduleRef.get(ProjectSecretsService)
  })

  it('reads the four vault groups and stringifies raw values', async () => {
    const project = makeProject()
    const projectId = faker.string.uuid()
    prisma.project.findUnique.mockResolvedValue(project)
    vaultClient.read
      .mockResolvedValueOnce(makeVaultSecret({ data: { key1: 'value1', key2: 42, key3: true, key4: null } })) // GITLAB
      .mockResolvedValueOnce(makeVaultSecret({ data: { NEXUS_SOME_TOKEN: 'ok' } })) // NEXUS
      .mockResolvedValueOnce(makeVaultSecret({ data: { REGISTRY_ROBOT_SECRET: 'robot' } })) // REGISTRY
      .mockResolvedValueOnce(makeVaultSecret({ data: { VAULT_ROLE: 'role' } })) // VAULT

    const result = await service.get(projectId)

    expect(vaultClient.read).toHaveBeenCalledWith(`forge/${project.slug}/GITLAB`)
    expect(vaultClient.read).toHaveBeenCalledWith(`forge/${project.slug}/NEXUS`)
    expect(vaultClient.read).toHaveBeenCalledWith(`forge/${project.slug}/REGISTRY`)
    expect(vaultClient.read).toHaveBeenCalledWith(`forge/${project.slug}/VAULT`)
    expect(result.GITLAB).toHaveProperty('key1', 'value1')
    expect(result.GITLAB).toHaveProperty('key2', '42')
    expect(result.GITLAB).toHaveProperty('key3', 'true')
    expect(result.GITLAB).toHaveProperty('key4', '')
    expect(result.NEXUS).toHaveProperty('NEXUS_SOME_TOKEN', 'ok')
    expect(result.REGISTRY).toHaveProperty('REGISTRY_ROBOT_SECRET', 'robot')
    expect(result.VAULT).toHaveProperty('VAULT_ROLE', 'role')
  })

  it('returns {} when every vault read fails', async () => {
    const project = makeProject()
    prisma.project.findUnique.mockResolvedValue(project)
    vaultClient.read.mockRejectedValue(new Error('vault unavailable'))

    const result = await service.get(faker.string.uuid())
    expect(result).toEqual({})
  })

  it('drops empty groups while keeping populated ones', async () => {
    const project = makeProject()
    prisma.project.findUnique.mockResolvedValue(project)
    vaultClient.read
      .mockResolvedValueOnce(makeVaultSecret({ data: { key1: 'value1' } })) // GITLAB
      .mockResolvedValue(makeVaultSecret({ data: {} })) // NEXUS/REGISTRY/VAULT

    const result = await service.get(faker.string.uuid())

    expect(result).toEqual({ GITLAB: { key1: 'value1' } })
  })

  describe('gitLab trigger hint (CURL COMMAND)', () => {
    beforeEach(() => {
      const project = makeProject()
      prisma.project.findUnique.mockResolvedValue(project)
      vaultClient.read
        .mockResolvedValueOnce(makeVaultSecret({ data: { GIT_MIRROR_PROJECT_ID: '42', GIT_MIRROR_TOKEN: 'secret-token' } })) // GITLAB
        .mockResolvedValue(makeVaultSecret({ data: {} })) // NEXUS/REGISTRY/VAULT
    })

    it('injects the hint when displayTriggerHint is enabled (default)', async () => {
      prisma.adminPlugin.findUnique.mockResolvedValue(null)

      const result = await service.get(faker.string.uuid())

      expect(result.GITLAB['CURL COMMAND']).toContain('curl -k')
      expect(result.GITLAB['CURL COMMAND']).toContain('https://gitlab.example.com/api/v4/projects/42/trigger/pipeline')
      expect(result.GITLAB['CURL COMMAND']).toContain('PRIVATE-TOKEN: secret-token')
      // line-continuation separator is a single backslash followed by a real newline
      expect(result.GITLAB['CURL COMMAND'].split('\n').length).toBeGreaterThan(1)
      expect(result.GITLAB['CURL COMMAND']).toMatch(/curl -k \\\n/)
    })

    it('does not inject when displayTriggerHint is disabled', async () => {
      prisma.adminPlugin.findUnique.mockResolvedValue(
        makeAdminPlugin({ pluginName: 'gitlab', key: 'displayTriggerHint', value: 'disabled' }),
      )

      const result = await service.get(faker.string.uuid())
      expect(result.GITLAB).toBeDefined()
      expect(result.GITLAB['CURL COMMAND']).toBeUndefined()
    })

    it('does not inject when mirror credentials are missing', async () => {
      vaultClient.read.mockReset()
      vaultClient.read.mockResolvedValue(makeVaultSecret({ data: {} }))
      prisma.adminPlugin.findUnique.mockResolvedValue(null)

      const result = await service.get(faker.string.uuid())
      expect(result.GITLAB).toBeUndefined()
    })
  })

  describe('computed secrets restoration', () => {
    let project: ReturnType<typeof makeProject>

    beforeEach(() => {
      project = makeProject()
      prisma.project.findUnique
        .mockResolvedValueOnce(project) // getProjectSlug
        .mockResolvedValueOnce(makeProject({
          plugins: [
            { pluginName: 'nexus', key: 'activateMavenRepo', value: 'enabled' },
            { pluginName: 'nexus', key: 'activateNpmRepo', value: 'enabled' },
          ],
        })) // getProjectPlugins
      vaultClient.read
        .mockResolvedValueOnce(makeVaultSecret({ data: { GIT_MIRROR_PROJECT_ID: '42', GIT_MIRROR_TOKEN: 'secret-token' } })) // GITLAB
        .mockResolvedValueOnce(makeVaultSecret({ // NEXUS
          data: { NEXUS_USERNAME: 'admin', NEXUS_PASSWORD: 'super-secret', NEXUS_SOME_TOKEN: 'ok' },
        }))
        .mockResolvedValueOnce(makeVaultSecret({ data: { REGISTRY_ROBOT_SECRET: 'robot' } })) // REGISTRY
        .mockResolvedValueOnce(makeVaultSecret({ data: { VAULT_ROLE: 'role' } })) // VAULT
    })

    it('scrubs leaked Nexus admin credentials and restores repo URLs', async () => {
      const result = await service.get(faker.string.uuid())

      expect(result.NEXUS.NEXUS_USERNAME).toBeUndefined()
      expect(result.NEXUS.NEXUS_PASSWORD).toBeUndefined()
      expect(result.NEXUS.NEXUS_SOME_TOKEN).toBe('ok')
      expect(result.NEXUS.MAVEN_REPO_RELEASE).toBe(`https://nexus.example.com/${project.slug}-repository-release`)
      expect(result.NEXUS.MAVEN_REPO_SNAPSHOT).toBe(`https://nexus.example.com/${project.slug}-repository-snapshot`)
      expect(result.NEXUS.NPM_REPO).toBe(`https://nexus.example.com/${project.slug}-npm`)
    })

    it('restores the Harbor registry base path hint', async () => {
      const result = await service.get(faker.string.uuid())
      expect(result.REGISTRY['Registry base path']).toBe(`harbor.example.com/${project.slug}/`)
    })

    it('restores the Vault ExternalSecret spec hints', async () => {
      const result = await service.get(faker.string.uuid())
      expect(result.VAULT['.spec.mount']).toBe(project.slug)
      expect(result.VAULT['.spec.vaultAuthRef']).toBe('vault-auth')
    })
  })
})
