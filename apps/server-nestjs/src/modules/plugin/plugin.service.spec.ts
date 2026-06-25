import type { ServiceInfos } from '@cpn-console/hooks'
import { Logger } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ArgoCDPluginService } from '../argocd/argocd-plugin.service'
import { GitlabPluginService } from '../gitlab/gitlab-plugin.service'
import { KeycloakPluginService } from '../keycloak/keycloak-plugin.service'
import { NexusPluginService } from '../nexus/nexus-plugin.service'
import { RegistryPluginService } from '../registry/registry-plugin.service'
import { SonarqubePluginService } from '../sonarqube/sonarqube-plugin.service'
import { VaultPluginService } from '../vault/vault-plugin.service'
import { PluginService } from './plugin.service'

function makeInfos(name: string): ServiceInfos {
  return { name, title: name }
}

describe('pluginService', () => {
  afterEach(() => vi.restoreAllMocks())

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
