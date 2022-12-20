import { describe, it, expect, vi, beforeEach } from 'vitest'
import { spawn } from 'child_process'
import { checkPlaybooksAccess, runPlaybook, ansible } from './ansible.js'
import { playbooksDictionary } from './utils/matches.js'
import { access } from 'fs'

vi.mock('fs')
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

  it('Should check playbook access', async () => {
    checkPlaybooksAccess(playbooksDictionary)

    expect(access).toHaveBeenCalled()
  })

  it('Should exit process if check playbook access failed', async () => {
    access.mockImplementationOnce((a, b, err) => err(true))

    checkPlaybooksAccess(playbooksDictionary)

    expect(access).toHaveBeenCalled()
    expect(process.exit).toHaveBeenCalledWith(1)
  })

  it('Should run playbook', async () => {
    const playbooks = ['test1.yml', 'test2.yml']
    const vars = { key1: 'value1', key2: 'value2' }

    runPlaybook(playbooks, vars)

    expect(spawn).toHaveBeenCalled()
  })

  it.skip('Should spawn a subprocess that run ansible', async (done) => {
    const playbooks = ['test1.yml']
    const vars = { key1: 'value1', key2: 'value2' }
    const env = 'test'
    const args = [
      '-i',
      `/test/inventory/${env}`,
      '--connection=local',
      '-e',
      `"${JSON.stringify(vars).replaceAll('"', '\\"')}"`,
    ]

    const playbookSpawn = ansible(playbooks, args)

    expect(spawn).toHaveBeenCalled()
    expect(playbookSpawn.spawnargs).toEqual(['ansible-playbook', `undefined/${playbooks[0]}`, ...args])
  })
})
