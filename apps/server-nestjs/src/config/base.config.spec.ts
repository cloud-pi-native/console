import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { baseConfigFactory } from './base.config'

describe('baseConfigFactory', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('does not throw when PROJECTS_ROOT_DIR is unset', () => {
    vi.stubEnv('PROJECTS_ROOT_DIR', '')
    delete process.env.PROJECTS_ROOT_DIR
    expect(() => baseConfigFactory()).not.toThrow()
    expect(baseConfigFactory().projectsRootDir).toBe('')
  })
})
