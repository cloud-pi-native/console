import { describe, it, expect, vi, beforeEach } from 'vitest'
import { spawn } from 'child_process'
import fp from 'fastify-plugin'
import { runPlaybook } from './ansible.js'

vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => vi.fn()) }))
vi.spyOn(process, 'exit').mockImplementation(vi.fn())
vi.mock('child_process')
spawn.mockImplementation((command, args) => ({
  on: vi.fn(),
  stdout: { on: vi.fn() },
  stderr: { on: vi.fn() },
  spawnargs: [command, ...args],
}))

describe('ansible', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Should run playbook', async () => {
    const playbooks = ['test1.yml', 'test2.yml']
    const vars = { key1: 'value1', key2: 'value2' }

    runPlaybook(playbooks, vars)

    expect(spawn).toHaveBeenCalled()
  })
})
