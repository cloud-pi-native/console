import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PluginModule } from './plugin.module'
import { PluginService } from './plugin.service'

describe('pluginModule', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('resolves PluginService with all plugins enabled', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      issuer: 'https://keycloak.test/realms/dso',
      jwks_uri: 'https://keycloak.test/realms/dso/protocol/openid-connect/certs',
    }))))
    vi.stubEnv('USE_ARGOCD', 'true')
    vi.stubEnv('USE_GITLAB', 'true')
    vi.stubEnv('USE_HARBOR', 'true')
    vi.stubEnv('USE_NEXUS', 'true')
    vi.stubEnv('USE_SONARQUBE', 'true')
    vi.stubEnv('VAULT_TOKEN', 'test-token')
    vi.stubEnv('VAULT_URL', 'https://vault.test/')
    vi.stubEnv('GITLAB_TOKEN', 'test-token')
    vi.stubEnv('GITLAB_URL', 'https://gitlab.test/')
    vi.stubEnv('NEXUS_URL', 'https://nexus.test/')
    vi.stubEnv('NEXUS_ADMIN', 'admin')
    vi.stubEnv('NEXUS_ADMIN_PASSWORD', 'pw')
    vi.stubEnv('HARBOR_URL', 'https://harbor.test/')
    vi.stubEnv('HARBOR_ADMIN', 'admin')
    vi.stubEnv('HARBOR_ADMIN_PASSWORD', 'pw')
    vi.stubEnv('SONARQUBE_URL', 'https://sonar.test/')
    vi.stubEnv('SONAR_API_TOKEN', 'token')
    vi.stubEnv('PROJECTS_ROOT_DIR', '/')
    vi.stubEnv('DB_URL', 'postgres://user:pw@localhost:5432/db')
    vi.stubEnv('KEYCLOAK_DOMAIN', 'keycloak.test')
    vi.stubEnv('KEYCLOAK_REALM', 'console')
    vi.stubEnv('KEYCLOAK_CLIENT_ID', 'console')
    vi.stubEnv('KEYCLOAK_CLIENT_SECRET', 'secret')
    vi.stubEnv('KEYCLOAK_ADMIN', 'admin')
    vi.stubEnv('KEYCLOAK_ADMIN_PASSWORD', 'pw')
    vi.stubEnv('KEYCLOAK_REDIRECT_URI', 'https://console.test/redirect')
    vi.stubEnv('GRAFANA_URL', 'https://grafana.test/')
    vi.stubEnv('DSO_OBSERVABILITY_CHART_VERSION', '1.0.0')
    vi.stubEnv('ARGOCD_URL', 'https://argocd.test/')
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(),
        PluginModule,
      ],
    }).compile()
    const service = module.get(PluginService)
    expect(service).toBeInstanceOf(PluginService)
  })
})
