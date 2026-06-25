import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { argocdConfigFactory } from './argocd.config'
import { resetEnvs } from './config-testing.utils'

describe('argocdConfig', () => {
  beforeEach(() => { resetEnvs(['ARGO_NAMESPACE', 'ARGOCD_URL', 'ARGOCD_INTERNAL_URL', 'DSO_ENV_CHART_VERSION', 'DSO_NS_CHART_VERSION', 'VAULT__DEPLOY_VAULT_CONNECTION_IN_NS']) })
  afterEach(() => { vi.unstubAllEnvs() })

  it('parses a full config', () => {
    vi.stubEnv('ARGOCD_URL', 'https://argocd.internal')
    vi.stubEnv('ARGOCD_INTERNAL_URL', 'https://argocd.internal:8080')
    vi.stubEnv('ARGOCD_EXTRA_REPOSITORIES', 'repo1')
    vi.stubEnv('VAULT__DEPLOY_VAULT_CONNECTION_IN_NS', 'true')
    vi.stubEnv('PROJECTS_ROOT_DIR', 'forge-test/projects')
    expect(argocdConfigFactory()).toMatchObject({
      namespace: 'argocd',
      url: 'https://argocd.internal',
      internalUrl: 'https://argocd.internal:8080',
      extraRepositories: ['repo1'],
      dsoEnvChartVersion: 'dso-env-1.6.0',
      dsoNsChartVersion: 'dso-ns-1.1.5',
      vaultDeployVaultConnectionInNs: true,
    })
  })

  it('falls back to public url when internal url is absent', () => {
    vi.stubEnv('ARGOCD_URL', 'https://argocd.internal')
    vi.stubEnv('ARGOCD_EXTRA_REPOSITORIES', 'repo1')
    vi.stubEnv('VAULT__DEPLOY_VAULT_CONNECTION_IN_NS', 'true')
    vi.stubEnv('PROJECTS_ROOT_DIR', 'forge-test/projects')
    const cfg = argocdConfigFactory()
    expect(cfg.internalUrl).toBeUndefined()
    expect(cfg.url).toBe('https://argocd.internal')
  })

  it('applies flag defaults', () => {
    vi.stubEnv('ARGOCD_URL', 'https://argocd.internal')
    vi.stubEnv('ARGOCD_EXTRA_REPOSITORIES', 'repo1')
    vi.stubEnv('PROJECTS_ROOT_DIR', 'forge-test/projects')
    expect(argocdConfigFactory().vaultDeployVaultConnectionInNs).toBe(false)
  })

  it('defaults extraRepositories to an empty array', () => {
    vi.stubEnv('ARGOCD_URL', 'https://argocd.internal')
    vi.stubEnv('PROJECTS_ROOT_DIR', 'forge-test/projects')
    expect(argocdConfigFactory().extraRepositories).toEqual([])
  })

  it('throws when a required var is missing', () => {
    expect(() => argocdConfigFactory()).toThrow()
  })
})
