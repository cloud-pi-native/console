import { describe, expect, it, vi } from 'vitest'
import { maybeCollectServiceSecrets, stringifySecretData } from './project-secrets.utils'

describe('stringifySecretData', () => {
  it('coerces every vault value to a string', () => {
    expect(stringifySecretData({ key1: 'value1', key2: 42, key3: false, key4: null, key5: undefined }))
      .toEqual({ key1: 'value1', key2: '42', key3: 'false', key4: '', key5: '' })
  })
})

describe('maybeCollectServiceSecrets', () => {
  it('stringifies the group and keys it by name', async () => {
    const service = { secrets: vi.fn().mockResolvedValue({ TOKEN: 123, URL: 'https://x' }) }
    expect(await maybeCollectServiceSecrets('p1', 'GITLAB', service))
      .toEqual({ GITLAB: { TOKEN: '123', URL: 'https://x' } })
  })

  it('returns {} when the service is absent or the group is empty', async () => {
    expect(await maybeCollectServiceSecrets('p1', 'VAULT')).toEqual({})
    const empty = { secrets: vi.fn().mockResolvedValue({}) }
    expect(await maybeCollectServiceSecrets('p1', 'VAULT', empty)).toEqual({})
  })
})
