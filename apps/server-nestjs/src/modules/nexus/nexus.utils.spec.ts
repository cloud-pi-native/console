import { describe, expect, it } from 'vitest'
import { NexusError } from './nexus-http-client.service'
import { generateNexusCredPath, isNexusNotFound } from './nexus.utils'

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
