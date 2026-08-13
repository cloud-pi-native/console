import { describe, expect, it } from 'vitest'
import { generateSecretGroupPath } from './vault.utils'

describe('vault path helpers', () => {
  it('scopes a group to the project path', () => {
    expect(generateSecretGroupPath('forge', 'my-project', 'GITLAB')).toBe('forge/my-project/GITLAB')
  })
})
