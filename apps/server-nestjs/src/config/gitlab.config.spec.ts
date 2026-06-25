import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetEnvs } from './config.spec.utils'
import { gitlabConfigFactory } from './gitlab.config'

describe('gitlabConfig', () => {
  beforeEach(() => { resetEnvs(['GITLAB_TOKEN', 'GITLAB_URL', 'GITLAB_INTERNAL_URL', 'GITLAB_MIRROR_TOKEN_EXPIRATION_DAYS', 'GITLAB_MIRROR_TOKEN_ROTATION_THRESHOLD_DAYS', 'GITLAB__SECRET_EXPOSE_INTERNAL_URL', 'PROJECTS_ROOT_DIR']) })
  afterEach(() => { vi.unstubAllEnvs() })

  it('parses a full config and composes internalOrPublicUrl/probeUrl', () => {
    vi.stubEnv('GITLAB_TOKEN', 'token')
    vi.stubEnv('GITLAB_URL', 'https://gitlab.example.com')
    vi.stubEnv('GITLAB_INTERNAL_URL', 'https://gitlab.internal:8080')
    vi.stubEnv('PROJECTS_ROOT_DIR', 'forge-test/projects')
    vi.stubEnv('GITLAB__SECRET_EXPOSE_INTERNAL_URL', '1')
    expect(gitlabConfigFactory()).toMatchObject({
      token: 'token',
      url: 'https://gitlab.example.com',
      internalUrl: 'https://gitlab.internal:8080',
      secretExposeInternalUrl: true,
      mirrorTokenExpirationDays: 180,
      mirrorTokenRotationThresholdDays: 90,
      projectRootDir: 'forge-test/projects',
      internalOrPublicUrl: 'https://gitlab.internal:8080',
      probeUrl: 'https://gitlab.internal:8080/-/health',
    })
  })

  it('falls back to public url when internal url is absent', () => {
    vi.stubEnv('GITLAB_TOKEN', 'token')
    vi.stubEnv('GITLAB_URL', 'https://gitlab.example.com')
    vi.stubEnv('PROJECTS_ROOT_DIR', 'forge-test/projects')
    vi.stubEnv('GITLAB__SECRET_EXPOSE_INTERNAL_URL', '1')
    const cfg = gitlabConfigFactory()
    expect(cfg.internalUrl).toBeUndefined()
    expect(cfg.internalOrPublicUrl).toBe('https://gitlab.example.com')
  })

  it('throws when a required var is missing', () => {
    expect(() => gitlabConfigFactory()).toThrow()
  })
})
