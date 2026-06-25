import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ArgoCDPluginService } from '../argocd/argocd-plugin.service'
import { GitlabPluginService } from '../gitlab/gitlab-plugin.service'
import { KeycloakPluginService } from '../keycloak/keycloak-plugin.service'
import { NexusPluginService } from '../nexus/nexus-plugin.service'
import { RegistryPluginService } from '../registry/registry-plugin.service'
import { SonarqubePluginService } from '../sonarqube/sonarqube-plugin.service'
import { VaultPluginService } from '../vault/vault-plugin.service'
import { PluginModule } from './plugin.module'
import { PluginService } from './plugin.service'

describe('pluginModule (all gates on)', () => {
  beforeEach(() => {
    vi.stubEnv('PROJECTS_ROOT_DIR', 'tmp/projects')
    vi.stubEnv('KEYCLOAK_PROTOCOL', 'https')
    vi.stubEnv('KEYCLOAK_DOMAIN', 'kc.example')
    vi.stubEnv('KEYCLOAK_REALM', 'master')
    vi.stubEnv('KEYCLOAK_CLIENT_ID', 'id')
    vi.stubEnv('KEYCLOAK_CLIENT_SECRET', 'secret')
    vi.stubEnv('KEYCLOAK_ADMIN', 'admin')
    vi.stubEnv('KEYCLOAK_ADMIN_PASSWORD', 'pw')
    vi.stubEnv('KEYCLOAK_ADMIN_CLIENT_ID', 'admin-cli')
    vi.stubEnv('KEYCLOAK_REDIRECT_URI', 'https://app.example/callback')
    vi.stubEnv('VAULT_TOKEN', 'token')
    vi.stubEnv('VAULT_URL', 'https://vault.example')
    vi.stubEnv('ARGOCD_URL', 'https://argocd.example')
    vi.stubEnv('ARGOCD_EXTRA_REPOSITORIES', 'repo')
    vi.stubEnv('GITLAB_TOKEN', 'token')
    vi.stubEnv('GITLAB_URL', 'https://gitlab.example')
    vi.stubEnv('HARBOR_URL', 'https://harbor.example')
    vi.stubEnv('HARBOR_ADMIN', 'admin')
    vi.stubEnv('HARBOR_ADMIN_PASSWORD', 'pw')
    vi.stubEnv('NEXUS_URL', 'https://nexus.example')
    vi.stubEnv('NEXUS_ADMIN', 'admin')
    vi.stubEnv('NEXUS_ADMIN_PASSWORD', 'pw')
    vi.stubEnv('SONARQUBE_URL', 'https://sonar.example')
    vi.stubEnv('SONAR_API_TOKEN', 'token')
    vi.stubEnv('USE_ARGOCD', 'true')
    vi.stubEnv('USE_GITLAB', 'true')
    vi.stubEnv('USE_REGISTRY', 'true')
    vi.stubEnv('USE_NEXUS', 'true')
    vi.stubEnv('USE_SONARQUBE', 'true')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('registers every plugin service', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ ignoreEnvFile: true }), PluginModule],
    }).compile()
    expect(moduleRef.get(PluginService, { strict: false })).toBeInstanceOf(PluginService)
    expect(moduleRef.get(KeycloakPluginService, { strict: false })).toBeInstanceOf(KeycloakPluginService)
    expect(moduleRef.get(VaultPluginService, { strict: false })).toBeInstanceOf(VaultPluginService)
    expect(moduleRef.get(ArgoCDPluginService, { strict: false })).toBeInstanceOf(ArgoCDPluginService)
    expect(moduleRef.get(GitlabPluginService, { strict: false })).toBeInstanceOf(GitlabPluginService)
    expect(moduleRef.get(RegistryPluginService, { strict: false })).toBeInstanceOf(RegistryPluginService)
    expect(moduleRef.get(NexusPluginService, { strict: false })).toBeInstanceOf(NexusPluginService)
    expect(moduleRef.get(SonarqubePluginService, { strict: false })).toBeInstanceOf(SonarqubePluginService)
  })
})
