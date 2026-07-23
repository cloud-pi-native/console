import { createHash } from 'node:crypto'
import { generateProjectKey as legacyGenerateProjectKey } from '@cpn-console/hooks'
import { describe, expect, it } from 'vitest'
import { generateProjectKey, generateTokenPair, verifyTokenHash } from './crypto'

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
  it('returns a plaintext token and a sha256 hex hash', async () => {
    const { password, hash } = await generateTokenPair()

    expect(password).toHaveLength(48)
    expect(password).toMatch(/^[a-z0-9-]+$/i)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('honours a custom length', async () => {
    const { password, hash } = await generateTokenPair(64)

    expect(password).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('produces distinct tokens on each call', async () => {
    const first = await generateTokenPair()
    const second = await generateTokenPair()

    expect(first.password).not.toBe(second.password)
    expect(first.hash).not.toBe(second.hash)
  })

  it('does not embed the plaintext token in the hash', async () => {
    const { password, hash } = await generateTokenPair()

    expect(hash).not.toContain(password)
  })

  it('round-trips: the generated hash verifies the plaintext token', async () => {
    const { password, hash } = await generateTokenPair()

    expect(await verifyTokenHash(password, hash)).toBe(true)
  })
})

describe('verifyTokenHash', () => {
  it('accepts a 64-char lowercase hex sha256 digest of the token', async () => {
    const token = 'some-plaintext-token'
    const hash = createHash('sha256').update(token).digest('hex')

    expect(await verifyTokenHash(token, hash)).toBe(true)
  })

  it('rejects a malformed (non-hex) hash', async () => {
    const token = 'some-plaintext-token'

    expect(await verifyTokenHash(token, 'not-a-valid-sha-hash')).toBe(false)
  })

  it('rejects the sha256 of a different token', async () => {
    const hash = createHash('sha256').update('other-token').digest('hex')

    expect(await verifyTokenHash('some-plaintext-token', hash)).toBe(false)
  })

  it('rejects an empty hash', async () => {
    const { password } = await generateTokenPair()

    expect(await verifyTokenHash(password, '')).toBe(false)
  })

  it('rejects an unrecognised format', async () => {
    const { password } = await generateTokenPair()

    expect(await verifyTokenHash(password, 'not-a-sha-hash')).toBe(false)
  })
})
