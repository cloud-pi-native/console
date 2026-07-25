import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDotenvPaths, getExistingDotenvPaths } from './dotenv.utils'

describe('dotenv.utils', () => {
  afterEach(() => vi.unstubAllEnvs())

  describe('getDotenvPaths', () => {
    it('returns [".env"] when no env vars set', () => {
      expect(getDotenvPaths()).toEqual(['.env'])
    })

    it('returns [".env", ".env.integ"] when INTEGRATION=true', () => {
      vi.stubEnv('INTEGRATION', 'true')
      expect(getDotenvPaths()).toEqual(['.env', '.env.integ'])
    })

    it('returns [".env.docker"] when DOCKER=true', () => {
      vi.stubEnv('DOCKER', 'true')
      expect(getDotenvPaths()).toEqual(['.env.docker'])
    })

    it('returns [".env.integ", ".env.docker"] when DOCKER=true and INTEGRATION=true', () => {
      vi.stubEnv('DOCKER', 'true')
      vi.stubEnv('INTEGRATION', 'true')
      expect(getDotenvPaths()).toEqual(['.env.integ', '.env.docker'])
    })
  })

  describe('getExistingDotenvPaths', () => {
    it('filters to only existing files', () => {
      const paths = getExistingDotenvPaths()
      expect(paths.every(p => typeof p === 'string')).toBe(true)
    })
  })
})
