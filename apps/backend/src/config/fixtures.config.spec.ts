import { describe, expect, it } from 'vitest'
import { parseFixtureConfig } from './fixtures.config'

const dbUrl = 'postgresql://admin:admin@localhost:5432/fixtures'

describe('parseFixtureConfig', () => {
  it.each(['development', 'test'])('allows an explicit reset in %s', (nodeEnv) => {
    expect(parseFixtureConfig({ NODE_ENV: nodeEnv, DB_URL: dbUrl }, ['--reset'])).toEqual({ dbUrl })
  })

  it.each(['production', '', undefined])('refuses NODE_ENV=%s even in CI', (nodeEnv) => {
    expect(() => parseFixtureConfig({ NODE_ENV: nodeEnv, CI: 'true', DB_URL: dbUrl }, ['--reset'])).toThrow('NODE_ENV')
  })

  it.each([[], ['--reset', '--unknown'], ['reset']])('requires the exact --reset argument: %j', (...args) => {
    expect(() => parseFixtureConfig({ NODE_ENV: 'test', DB_URL: dbUrl }, args)).toThrow('--reset')
  })

  it('refuses integration environments', () => {
    expect(() => parseFixtureConfig({ NODE_ENV: 'test', INTEGRATION: 'true', DB_URL: dbUrl }, ['--reset'])).toThrow('INTEGRATION')
  })

  it.each([undefined, '', 'file:./database', 'https://example.com/db', 'postgresql://localhost'])('requires an explicit PostgreSQL DB_URL: %s', (url) => {
    expect(() => parseFixtureConfig({ NODE_ENV: 'test', DB_URL: url }, ['--reset'])).toThrow('DB_URL')
  })
})
