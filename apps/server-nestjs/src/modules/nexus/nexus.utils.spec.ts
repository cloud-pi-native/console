import { describe, expect, it } from 'vitest'
import { generateNexusCredPath } from './nexus.utils'

describe('nexus path helpers', () => {
  it('scopes the NEXUS credentials to the project', () => {
    expect(generateNexusCredPath('forge', 'my-project')).toBe('forge/my-project/NEXUS')
  })
})
