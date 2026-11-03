import { ClusterPrivacy, ProjectStatus, TokenStatus, UserType } from '@prisma/client'
import { data } from '../../../../packages/test-utils/src/imports/data'
import { parseFixtureConfig, parseFixtures } from './fixtures.utils'

const dbUrl = 'postgresql://admin:admin@localhost:5432/fixtures'

describe('parseFixtureConfig', () => {
  it.each(['development', 'test'])('allows an explicit reset in %s', (nodeEnv) => {
    expect(parseFixtureConfig({ NODE_ENV: nodeEnv, DB_URL: dbUrl }, ['--reset'])).toEqual({ dbUrl })
  })

  it.each(['production', '', undefined])('refuses NODE_ENV=%s', (nodeEnv) => {
    expect(() => parseFixtureConfig({ NODE_ENV: nodeEnv, DB_URL: dbUrl }, ['--reset'])).toThrow('NODE_ENV')
  })

  it('refuses production even with CI=true', () => {
    expect(() => parseFixtureConfig({ NODE_ENV: 'production', CI: 'true', DB_URL: dbUrl }, ['--reset'])).toThrow('NODE_ENV')
  })

  it.each([[], ['--reset', '--unknown'], ['reset']])('requires the exact --reset argument: %j', (...args) => {
    expect(() => parseFixtureConfig({ NODE_ENV: 'test', DB_URL: dbUrl }, args)).toThrow('--reset')
  })

  it('refuses integration environments', () => {
    expect(() => parseFixtureConfig({ NODE_ENV: 'test', INTEGRATION: 'true', DB_URL: dbUrl }, ['--reset'])).toThrow('INTEGRATION')
  })

  it.each([undefined, '', 'file:./database', 'https://example.com/db', 'postgresql://localhost'])('refuses DB_URL=%s', (url) => {
    expect(() => parseFixtureConfig({ NODE_ENV: 'test', DB_URL: url }, ['--reset'])).toThrow('DB_URL')
  })
})

describe('parseFixtures', () => {
  it('preserves the versioned fixture records and parses permissions and enums', () => {
    const fixtures = parseFixtures(data)

    expect(fixtures.adminRole).toHaveLength(data.adminRole.length)
    expect(fixtures.adminRole[0].permissions).toBe(3n)
    expect(fixtures.adminToken[0].permissions).toBe(2n)
    expect(fixtures.adminToken[1].status).toBe(TokenStatus.revoked)
    expect(fixtures.project[0].everyonePerms).toBe(768n)
    expect(fixtures.projectRole[0].permissions).toBe(2n)
    expect(fixtures.cluster[0].privacy).toBe(ClusterPrivacy.public)
    expect(fixtures.project[0].status).toBe(ProjectStatus.created)
    expect(fixtures.user[0].type).toBe(UserType.bot)
    expect(fixtures.associations).toEqual(data.associations)
    expect(fixtures.log).toEqual(data.log)
    expect(data.adminRole[0].permissions).toBe('3n')
  })

  it('rejects invalid bigint permissions with the offending field', () => {
    expect(() => parseFixtures({ ...data, adminRole: [{ ...data.adminRole[0], permissions: 'invalid' }] })).toThrow('permissions')
  })

  it('rejects an invalid project status', () => {
    expect(() => parseFixtures({ ...data, project: [{ ...data.project[0], status: 'invalid' }] })).toThrow('status')
  })

  it('rejects unsupported association models before importing', () => {
    expect(() => parseFixtures({ ...data, associations: [['user', []]] })).toThrow('associations')
  })
})
