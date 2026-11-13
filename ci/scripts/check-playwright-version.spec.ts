import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { it } from 'vitest'

function runCheck(runnerVersion: string | undefined, packageContents: string | null = '{"version":"1.65.0"}') {
  const directory = mkdtempSync(join(tmpdir(), 'playwright-version-'))
  try {
    const scriptsDirectory = join(directory, 'ci/scripts')
    const packageDirectory = join(directory, 'playwright/node_modules/@playwright/test')
    mkdirSync(scriptsDirectory, { recursive: true })
    mkdirSync(packageDirectory, { recursive: true })
    copyFileSync(new URL('./check-playwright-version.ts', import.meta.url), join(scriptsDirectory, 'check-playwright-version.ts'))
    writeFileSync(join(directory, 'package.json'), '{"type":"module"}')
    if (packageContents !== null) {
      writeFileSync(join(packageDirectory, 'package.json'), packageContents)
    }
    const env = { ...process.env }
    delete env.RUNNER_PLAYWRIGHT_VERSION
    if (runnerVersion !== undefined) {
      env.RUNNER_PLAYWRIGHT_VERSION = runnerVersion
    }
    return spawnSync(process.execPath, [join(scriptsDirectory, 'check-playwright-version.ts')], {
      cwd: tmpdir(),
      env,
      encoding: 'utf8',
    })
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

it('accepts identical exact versions from the installed package and the runner', () => {
  const result = runCheck('1.65.0')
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /1\.65\.0/)
})

for (const runnerVersion of ['1.64.0', '1.65.1']) {
  it(`rejects a different runner version: ${runnerVersion}`, () => {
    const result = runCheck(runnerVersion)
    assert.equal(result.status, 1)
    assert.match(result.stderr, /::error::/)
    assert.ok(result.stderr.includes('1.65.0'))
    assert.ok(result.stderr.includes(runnerVersion))
    assert.match(result.stderr, /alignement explicite/)
  })
}

for (const runnerVersion of [undefined, '', 'latest', '^1.65.0', ' 1.65.0', '1.65.0\n']) {
  it(`rejects missing or unreadable runner version: ${JSON.stringify(runnerVersion)}`, () => {
    const result = runCheck(runnerVersion)
    assert.equal(result.status, 1)
    assert.match(result.stderr, /::error::.*RUNNER_PLAYWRIGHT_VERSION/)
  })
}

for (const packageContents of ['{}', '{"version":165}', '{"version":"^1.65.0"}', 'invalid json']) {
  it(`rejects an invalid installed package: ${packageContents}`, () => {
    const result = runCheck('1.65.0', packageContents)
    assert.equal(result.status, 1)
    assert.match(result.stderr, /::error::.*@playwright\/test/)
  })
}

it('rejects a missing installed application package', () => {
  // An empty package directory must not fall back to a globally installed CLI.
  const result = runCheck('1.65.0', null)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /::error::.*@playwright\/test/)
})
