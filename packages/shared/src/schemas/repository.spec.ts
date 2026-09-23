import { faker } from '@faker-js/faker'
import { describe, expect, it } from 'vitest'
import { defaultBranchName } from '../utils/const.js'
import { RepoSchema } from './repository.js'

describe('repoSchema', () => {
  it('defaults a repository response without a branch to main', () => {
    const repository = RepoSchema.parse({
      id: faker.string.uuid(),
      projectId: faker.string.uuid(),
      internalRepoName: 'my-repo',
      externalRepoUrl: '',
      isPrivate: false,
      isInfra: false,
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.past().toISOString(),
    })

    expect(repository.branchName).toBe(defaultBranchName)
  })
})
