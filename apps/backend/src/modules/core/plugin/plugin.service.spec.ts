import type { ServiceInfos } from './plugin.types'
import { Logger } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ArgoCDPluginService } from '../../integrations/argocd/argocd-plugin.service'
import { GitlabPluginService } from '../../integrations/gitlab/gitlab-plugin.service'
import { KeycloakPluginService } from '../../integrations/keycloak/keycloak-plugin.service'
import { NexusPluginService } from '../../integrations/nexus/nexus-plugin.service'
import { ObservabilityPluginService } from '../../integrations/observability/observability-plugin.service'
import { RegistryPluginService } from '../../integrations/registry/registry-plugin.service'
import { SonarqubePluginService } from '../../integrations/sonarqube/sonarqube-plugin.service'
import { VaultPluginService } from '../../integrations/vault/vault-plugin.service'
import { PluginService } from './plugin.service'

function makeInfos(name: string): ServiceInfos {
  return { name, title: name }
}

describe('pluginService', () => {
  afterEach(() => vi.restoreAllMocks())

  describe('manifests', () => {
    it('collects enabled integrations without resolving project information', async () => {
      const keycloak = mockDeep<KeycloakPluginService>()
      const registry = mockDeep<RegistryPluginService>()
      const observability = mockDeep<ObservabilityPluginService>()
      keycloak.infos.mockReturnValue(makeInfos('keycloak'))
      registry.manifest.mockReturnValue(makeInfos('registry'))
      observability.manifest.mockReturnValue(makeInfos('observability'))
      const moduleRef = await Test.createTestingModule({
        providers: [
          PluginService,
          { provide: KeycloakPluginService, useValue: keycloak },
          { provide: RegistryPluginService, useValue: registry },
          { provide: ObservabilityPluginService, useValue: observability },
        ],
      }).compile()
      expect(moduleRef.get(PluginService).manifests().map(info => info.name)).toEqual(['registry', 'keycloak', 'observability'])
      expect(registry.infos).not.toHaveBeenCalled()
      expect(observability.infos).not.toHaveBeenCalled()
    })
  })

  describe('infos', () => {
    it('collects results from all plugins when every plugin is registered', async () => {
      const keycloak = mockDeep<KeycloakPluginService>()
      const vault = mockDeep<VaultPluginService>()
      const argocd = mockDeep<ArgoCDPluginService>()
      const gitlab = mockDeep<GitlabPluginService>()
      const nexus = mockDeep<NexusPluginService>()
      const registry = mockDeep<RegistryPluginService>()
      const sonarqube = mockDeep<SonarqubePluginService>()

      keycloak.infos.mockReturnValue(makeInfos('keycloak'))
      vault.infos.mockReturnValue(makeInfos('vault'))
      argocd.infos.mockReturnValue(makeInfos('argocd'))
      gitlab.infos.mockReturnValue(makeInfos('gitlab'))
      nexus.infos.mockReturnValue(makeInfos('nexus'))
      registry.infos.mockResolvedValue(makeInfos('registry'))
      sonarqube.infos.mockReturnValue(makeInfos('sonarqube'))

      const moduleRef = await Test.createTestingModule({
        providers: [
          PluginService,
          { provide: KeycloakPluginService, useValue: keycloak },
          { provide: VaultPluginService, useValue: vault },
          { provide: ArgoCDPluginService, useValue: argocd },
          { provide: GitlabPluginService, useValue: gitlab },
          { provide: NexusPluginService, useValue: nexus },
          { provide: RegistryPluginService, useValue: registry },
          { provide: SonarqubePluginService, useValue: sonarqube },
        ],
      }).compile()
      const service = moduleRef.get(PluginService)

      const result = await service.infos('project-1')

      expect(registry.infos).toHaveBeenCalledWith('project-1')
      expect(result.map(r => r.name).toSorted((a, b) => a.localeCompare(b))).toEqual(
        ['argocd', 'gitlab', 'keycloak', 'nexus', 'registry', 'sonarqube', 'vault'],
      )
    })

    it('skips absent optional plugins and warns on rejection', async () => {
      const keycloak = mockDeep<KeycloakPluginService>()
      const vault = mockDeep<VaultPluginService>()

      keycloak.infos.mockReturnValue(makeInfos('keycloak'))
      vault.infos.mockReturnValue(makeInfos('vault'))

      const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)

      const moduleRef = await Test.createTestingModule({
        providers: [
          PluginService,
          { provide: KeycloakPluginService, useValue: keycloak },
          { provide: VaultPluginService, useValue: vault },
        ],
      }).compile()
      const service = moduleRef.get(PluginService)

      const result = await service.infos('project-1')

      expect(result.map(r => r.name).toSorted((a, b) => a.localeCompare(b))).toEqual(['keycloak', 'vault'])
      expect(warnSpy).not.toHaveBeenCalled()
    })

    it('logs a warning and omits a plugin whose infos() rejects', async () => {
      const keycloak = mockDeep<KeycloakPluginService>()
      const vault = mockDeep<VaultPluginService>()
      const argocd = mockDeep<ArgoCDPluginService>()

      keycloak.infos.mockReturnValue(makeInfos('keycloak'))
      vault.infos.mockReturnValue(makeInfos('vault'))
      argocd.infos.mockRejectedValue(new Error('boom'))

      const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)

      const moduleRef = await Test.createTestingModule({
        providers: [
          PluginService,
          { provide: KeycloakPluginService, useValue: keycloak },
          { provide: VaultPluginService, useValue: vault },
          { provide: ArgoCDPluginService, useValue: argocd },
        ],
      }).compile()
      const service = moduleRef.get(PluginService)

      const result = await service.infos('project-1')

      expect(result.map(r => r.name).toSorted((a, b) => a.localeCompare(b))).toEqual(['keycloak', 'vault'])
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Skipping project service plugin argocd'),
      )
    })
  })
})
