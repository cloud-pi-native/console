import { generateProjectKey as legacyGenerateProjectKey } from '@cpn-console/hooks'
import { describe, expect, it } from 'vitest'
import { generateProjectKey, generateTokenPair } from './crypto.utils'

describe('generateProjectKey', () => {
  it('matches the legacy @cpn-console/hooks implementation byte-for-byte', () => {
    const cases: [string, string][] = [
      ['my-app', 'my-repo'],
      ['my-app', 'front'],
      ['my-app-2', 'front'],
      ['slug-with-many-dashes', 'repo-with-dashes'],
      ['a', 'b'],
    ]
    for (const [slug, repo] of cases) {
      expect(generateProjectKey(slug, repo)).toBe(legacyGenerateProjectKey(slug, repo))
    }
  })

  it('produces stable known keys', () => {
    // Golden values: existing SonarQube projects were created with these exact keys,
    // and reconciliation recomputes them to decide ownership. Any change here means
    // the console would stop recognizing (and could delete) existing projects.
    expect(generateProjectKey('my-app', 'my-repo')).toBe('my-app-my-repo-923f')
    expect(generateProjectKey('my-app', 'front')).toBe('my-app-front-1013')
    expect(generateProjectKey('my-app', 'api')).toBe('my-app-api-a814')
  })

  it('disambiguates identical slug-repo concatenations via the hash suffix', () => {
    // "my-app" + "front-api" and "my-app-front" + "api" share the prefix
    // "my-app-front-api-"; only the repo hash tells them apart.
    expect(generateProjectKey('my-app', 'front-api')).not.toBe(generateProjectKey('my-app-front', 'api'))
  })
})

describe('generateTokenPair', () => {
  it('returns a plaintext token and a sha256 hex hash', () => {
    const { password, hash } = generateTokenPair()

    expect(password).toHaveLength(48)
    expect(password).toMatch(/^[a-z0-9-]+$/i)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('honours a custom length', () => {
    const { password, hash } = generateTokenPair(64)

    expect(password).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('produces distinct tokens on each call', () => {
    const first = generateTokenPair()
    const second = generateTokenPair()

    expect(first.password).not.toBe(second.password)
    expect(first.hash).not.toBe(second.hash)
  })

  it('does not embed the plaintext token in the hash', () => {
    const { password, hash } = generateTokenPair()

    expect(hash).not.toContain(password)
  })
})
