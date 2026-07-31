import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetEnvs } from './config-testing.utils'
import { gitlabConfigFactory } from './gitlab.config'

describe('gitlabConfig', () => {
  beforeEach(() => { resetEnvs(['GITLAB_TOKEN', 'GITLAB_URL', 'GITLAB_INTERNAL_URL', 'GITLAB_MIRROR_TOKEN_EXPIRATION_DAYS', 'GITLAB_MIRROR_TOKEN_ROTATION_THRESHOLD_DAYS', 'GITLAB__SECRET_EXPOSE_INTERNAL_URL', 'PROJECTS_ROOT_DIR']) })
  afterEach(() => { vi.unstubAllEnvs() })

  it('parses a full config', () => {
    vi.stubEnv('GITLAB_TOKEN', 'token')
    vi.stubEnv('GITLAB_URL', 'https://gitlab.internal')
    vi.stubEnv('GITLAB_INTERNAL_URL', 'https://gitlab.internal:8080')
    vi.stubEnv('PROJECTS_ROOT_DIR', 'forge-test/projects')
    vi.stubEnv('GITLAB__SECRET_EXPOSE_INTERNAL_URL', '1')
    expect(gitlabConfigFactory()).toMatchObject({
      token: 'token',
      url: 'https://gitlab.internal',
      internalUrl: 'https://gitlab.internal:8080',
      secretExposeInternalUrl: true,
      mirrorTokenExpirationDays: 365,
      projectRootDir: 'forge-test/projects',
    })
  })

  it('falls back to public url when internal url is absent', () => {
    vi.stubEnv('GITLAB_TOKEN', 'token')
    vi.stubEnv('GITLAB_URL', 'https://gitlab.internal')
    vi.stubEnv('PROJECTS_ROOT_DIR', 'forge-test/projects')
    vi.stubEnv('GITLAB__SECRET_EXPOSE_INTERNAL_URL', '1')
    const cfg = gitlabConfigFactory()
    expect(cfg.internalUrl).toBeUndefined()
    expect(cfg.url).toBe('https://gitlab.internal')
  })

  it('throws when a required var is missing', () => {
    expect(() => gitlabConfigFactory()).toThrow()
  })
})
