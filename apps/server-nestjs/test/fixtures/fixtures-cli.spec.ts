import { spawnSync } from 'node:child_process'
import path from 'node:path'

describe('db:fixtures CLI safety', () => {
  it.each([
    { NODE_ENV: 'production', INTEGRATION: 'false', field: 'NODE_ENV' },
    { NODE_ENV: '', INTEGRATION: 'false', field: 'NODE_ENV' },
    { NODE_ENV: 'test', INTEGRATION: 'true', field: 'INTEGRATION' },
  ])('refuses $field before connecting to PostgreSQL ($NODE_ENV/$INTEGRATION)', ({ field, ...env }) => {
    const result = spawnSync('pnpm', ['run', 'db:fixtures', '--reset'], {
      cwd: path.resolve(__dirname, '../..'),
      env: { ...process.env, ...env, CI: 'true', DB_URL: 'postgresql://admin:admin@127.0.0.1:1/fixtures' },
      encoding: 'utf8',
      timeout: 10000,
    })

    expect(result.error).toBeUndefined()
    expect(result.status).toBe(1)
    expect(result.stderr).toContain(field)
    expect(result.stderr).not.toContain('Can\'t reach database server')
    expect(result.stdout).not.toContain('reset successfully')
  })
})
