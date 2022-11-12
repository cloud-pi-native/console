import { describe, it, expect, vi, beforeEach } from 'vitest'
import { spawnProcess } from './ansible.js'
import { Stream } from 'node:stream'

vi.mock('../app.js', () => ({ default: { log: { info: vi.fn() } } }))
vi.spyOn(console, 'log').mockImplementation(vi.fn())
vi.spyOn(console, 'error').mockImplementation(vi.fn())

describe('ansible-util', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Should spawn a subprocess with given command & args', async () => {
    const command = 'node'
    const args = ['--version']

    const childProcess = await spawnProcess(command, args)

    expect(childProcess.spawnargs).toEqual([command, ...args])
    expect(childProcess.stdout).toBeInstanceOf(Stream)
    expect(childProcess.stderr).toBeInstanceOf(Stream)
  })

  it('Should spawn a subprocess & get an error', async (done) => {
    const command = 'ls'
    const args = ['path/that/not/exists']

    const childProcess = await spawnProcess(command, args)

    expect(childProcess.spawnargs).toEqual([command, ...args])
    expect(childProcess.stdout).toBeInstanceOf(Stream)
    expect(childProcess.stderr).toBeInstanceOf(Stream)
  })
})
