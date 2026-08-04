import { describe, expect, it } from 'vitest'
import { generateGitlabTriggerTokenPath } from './vault.utils'

describe('vault path helpers', () => {
  it('scopes the GitLab trigger token to the project', () => {
    expect(generateGitlabTriggerTokenPath('forge', 'my-project')).toBe('forge/my-project/GITLAB')
  })
})
