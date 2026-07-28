import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetEnvs } from './config.spec.utils'
import { harborConfigFactory } from './harbor.config'

describe('harborConfig', () => {
  beforeEach(() => { resetEnvs(['HARBOR_URL', 'HARBOR_INTERNAL_URL', 'HARBOR_ADMIN', 'HARBOR_ADMIN_PASSWORD', 'HARBOR_RULE_TEMPLATE', 'HARBOR_RULE_COUNT', 'HARBOR_RETENTION_CRON', 'HARBOR_ROBOT_ROTATION_THRESHOLD_DAYS', 'HARBOR_PROJECT_SLUG_CACHE_TTL_MS']) })
  afterEach(() => { vi.unstubAllEnvs() })

  it('parses a full config and composes internalOrPublicUrl/probeUrl', () => {
    vi.stubEnv('HARBOR_URL', 'https://harbor.example.com')
    vi.stubEnv('HARBOR_INTERNAL_URL', 'https://harbor.internal:8080')
    vi.stubEnv('HARBOR_ADMIN', 'admin')
    vi.stubEnv('HARBOR_ADMIN_PASSWORD', 'pw')
    vi.stubEnv('HARBOR_RULE_TEMPLATE', 'always')
    vi.stubEnv('HARBOR_RULE_COUNT', '3')
    expect(harborConfigFactory()).toMatchObject({
      url: 'https://harbor.example.com',
      internalUrl: 'https://harbor.internal:8080',
      admin: 'admin',
      adminPassword: 'pw',
      ruleTemplate: 'always',
      ruleCount: 3,
      retentionCron: '0 22 2 * * *',
      robotRotationThresholdDays: 90,
      projectSlugCacheTtlMs: 300_000,
      internalOrPublicUrl: 'https://harbor.internal:8080',
      probeUrl: 'https://harbor.internal:8080/api/v2.0/ping',
    })
  })

  it('falls back to public url when internal url is absent', () => {
    vi.stubEnv('HARBOR_URL', 'https://harbor.example.com')
    vi.stubEnv('HARBOR_ADMIN', 'admin')
    vi.stubEnv('HARBOR_ADMIN_PASSWORD', 'pw')
    vi.stubEnv('HARBOR_RULE_TEMPLATE', 'latestPushedK')
    vi.stubEnv('HARBOR_RULE_COUNT', '3')
    const cfg = harborConfigFactory()
    expect(cfg.internalUrl).toBeUndefined()
    expect(cfg.internalOrPublicUrl).toBe('https://harbor.example.com')
  })

  it('applies defaults when optional rule fields are absent', () => {
    vi.stubEnv('HARBOR_URL', 'https://harbor.example.com')
    vi.stubEnv('HARBOR_ADMIN', 'admin')
    vi.stubEnv('HARBOR_ADMIN_PASSWORD', 'pw')
    const cfg = harborConfigFactory()
    expect(cfg.ruleTemplate).toBeUndefined()
    expect(cfg.ruleCount).toBeUndefined()
    expect(cfg.retentionCron).toBe('0 22 2 * * *')
  })

  it('parses with empty vars (Harbor disabled, probeUrl undefined)', () => {
    expect(harborConfigFactory().probeUrl).toBeUndefined()
  })
})
