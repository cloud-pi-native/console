import { describe, expect, it, vi } from 'vitest'
import { NexusError } from './nexus-http-client.service'
import { ensure, generateNexusCredPath, isNexusAlreadyExists, isNexusNotFound } from './nexus.utils'

describe('nexus path helpers', () => {
  it('scopes the NEXUS credentials to the project', () => {
    expect(generateNexusCredPath('forge', 'my-project')).toBe('forge/my-project/NEXUS')
  })
})

describe('isNexusNotFound', () => {
  it('matches a 404 NexusError', () => {
    expect(isNexusNotFound(new NexusError('HttpError', 'not found', { status: 404 }))).toBe(true)
  })

  it('rejects a non-404 NexusError and non-Nexus errors', () => {
    expect(isNexusNotFound(new NexusError('HttpError', 'conflict', { status: 409 }))).toBe(false)
    expect(isNexusNotFound(new Error('boom'))).toBe(false)
    expect(isNexusNotFound(null)).toBe(false)
  })
})

describe('isNexusAlreadyExists', () => {
  it('matches a 409 or an already/exists message', () => {
    expect(isNexusAlreadyExists(new NexusError('HttpError', 'conflict', { status: 409 }))).toBe(true)
    expect(isNexusAlreadyExists(new NexusError('HttpError', 'Repository already exists', { status: 400 }))).toBe(true)
  })

  it('rejects other errors', () => {
    expect(isNexusAlreadyExists(new NexusError('HttpError', 'bad request', { status: 400 }))).toBe(false)
    expect(isNexusAlreadyExists(new Error('already exists'))).toBe(false)
    expect(isNexusAlreadyExists(null)).toBe(false)
  })
})

describe('ensure', () => {
  it('returns the created value when create succeeds', async () => {
    const reload = vi.fn()

    await expect(ensure({ create: async () => 'created', reload })).resolves.toBe('created')

    expect(reload).not.toHaveBeenCalled()
  })

  it('reloads once on a collision and never retries create', async () => {
    const error = new NexusError('HttpError', 'already exists', { status: 409 })
    const create = vi.fn(async () => { throw error })
    const onCollision = vi.fn()
    const reload = vi.fn(async () => 'existing')

    await expect(ensure({ create, reload, onCollision })).resolves.toBe('existing')

    expect(create).toHaveBeenCalledOnce()
    expect(onCollision).toHaveBeenCalledWith(error)
    expect(reload).toHaveBeenCalledOnce()
  })

  it('rethrows the original error when a collision finds nothing on reload', async () => {
    const error = new NexusError('HttpError', 'already exists', { status: 409 })

    await expect(ensure({ create: async () => { throw error }, reload: async () => undefined })).rejects.toBe(error)
  })

  it('rethrows non-collision errors without reloading', async () => {
    const error = new NexusError('HttpError', 'forbidden', { status: 403 })
    const reload = vi.fn()

    await expect(ensure({ create: async () => { throw error }, reload })).rejects.toBe(error)

    expect(reload).not.toHaveBeenCalled()
  })
})
