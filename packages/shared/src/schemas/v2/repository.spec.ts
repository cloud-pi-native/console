import { faker } from '@faker-js/faker'
import { describe, expect, it } from 'vitest'
import { CreateRepositorySchema, SyncRepositorySchema } from './repository.js'

describe('createRepositorySchema', () => {
  const gitUrl = `https://${faker.internet.domainName()}/repo.git`

  it('collapses an absent external url to an empty string', () => {
    const parsed = CreateRepositorySchema.parse({
      internalRepoName: 'my-repo',
      isInfra: false,
      isPrivate: false,
    })

    expect(parsed.externalRepoUrl).toBe('')
  })

  it('keeps an empty external url as an empty string', () => {
    const parsed = CreateRepositorySchema.parse({
      internalRepoName: 'my-repo',
      externalRepoUrl: '',
      isInfra: false,
      isPrivate: false,
    })

    expect(parsed.externalRepoUrl).toBe('')
  })

  it('keeps a valid external url as-is', () => {
    const parsed = CreateRepositorySchema.parse({
      internalRepoName: 'my-repo',
      externalRepoUrl: gitUrl,
      isInfra: false,
      isPrivate: false,
    })

    expect(parsed.externalRepoUrl).toBe(gitUrl)
  })

  it('defaults the deployment fields at the boundary when they are not filled', () => {
    const parsed = CreateRepositorySchema.parse({
      internalRepoName: 'my-repo',
      isInfra: false,
      isPrivate: false,
    })

    expect(parsed).toMatchObject({
      deployRevision: 'HEAD',
      deployPath: '.',
      helmValuesFiles: '',
    })
  })

  it('defaults an empty deployRevision to HEAD', () => {
    const parsed = CreateRepositorySchema.parse({
      internalRepoName: 'my-repo',
      isInfra: false,
      isPrivate: false,
      deployRevision: '',
    })

    expect(parsed.deployRevision).toBe('HEAD')
  })

  it('keeps the deployment fields that are filled', () => {
    const parsed = CreateRepositorySchema.parse({
      internalRepoName: 'my-repo',
      isInfra: false,
      isPrivate: false,
      deployRevision: 'main',
      deployPath: 'charts/app',
      helmValuesFiles: 'values.yaml',
    })

    expect(parsed).toMatchObject({
      deployRevision: 'main',
      deployPath: 'charts/app',
      helmValuesFiles: 'values.yaml',
    })
  })

  it('strips credentials that a public repository is not allowed to carry', () => {
    const parsed = CreateRepositorySchema.parse({
      internalRepoName: 'my-repo',
      isInfra: false,
      isPrivate: false,
      externalUserName: faker.internet.username(),
      externalToken: faker.string.alphanumeric(16),
    })

    expect(parsed).not.toHaveProperty('externalUserName')
    expect(parsed).not.toHaveProperty('externalToken')
  })

  it('accepts a private repository that provides both a username and a token', () => {
    const externalUserName = faker.internet.username()
    const externalToken = faker.string.alphanumeric(16)
    const parsed = CreateRepositorySchema.parse({
      internalRepoName: 'my-repo',
      externalRepoUrl: gitUrl,
      isInfra: false,
      isPrivate: true,
      externalUserName,
      externalToken,
    })

    expect(parsed).toMatchObject({ isPrivate: true, externalUserName, externalToken })
  })

  // Un seul credential suffit : l'autre est collapsé en chaîne vide au boundary.
  it('accepts a private repository providing only a token', () => {
    const externalToken = faker.string.alphanumeric(16)
    const parsed = CreateRepositorySchema.parse({
      internalRepoName: 'my-repo',
      externalRepoUrl: gitUrl,
      isInfra: false,
      isPrivate: true,
      externalToken,
    })

    expect(parsed).toMatchObject({ isPrivate: true, externalUserName: '', externalToken })
  })

  it('accepts a private repository providing only a username', () => {
    const externalUserName = faker.internet.username()
    const parsed = CreateRepositorySchema.parse({
      internalRepoName: 'my-repo',
      externalRepoUrl: gitUrl,
      isInfra: false,
      isPrivate: true,
      externalUserName,
    })

    expect(parsed).toMatchObject({ isPrivate: true, externalUserName, externalToken: '' })
  })

  it('rejects a private repository without any credential', () => {
    const result = CreateRepositorySchema.safeParse({
      internalRepoName: 'my-repo',
      externalRepoUrl: gitUrl,
      isInfra: false,
      isPrivate: true,
    })

    expect(result.success).toBe(false)
  })

  it('rejects a private repository whose credentials are both empty', () => {
    const result = CreateRepositorySchema.safeParse({
      internalRepoName: 'my-repo',
      externalRepoUrl: gitUrl,
      isInfra: false,
      isPrivate: true,
      externalUserName: '',
      externalToken: '',
    })

    expect(result.success).toBe(false)
  })
})

describe('syncRepositorySchema', () => {
  it('accepts a full sync without a branch', () => {
    const result = SyncRepositorySchema.safeParse({ syncAllBranches: true })

    expect(result.success).toBe(true)
  })

  // The discriminated union makes a full sync incapable of carrying a branch: the key is
  // stripped at the boundary rather than reaching the mirror pipeline.
  it('strips a branch smuggled into a full sync', () => {
    const result = SyncRepositorySchema.safeParse({ syncAllBranches: true, branchName: 'main' })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ syncAllBranches: true })
  })

  it('accepts a partial sync naming its branch', () => {
    const result = SyncRepositorySchema.safeParse({ syncAllBranches: false, branchName: 'main' })

    expect(result.success).toBe(true)
  })

  // A partial sync with no branch designates nothing to mirror: rejected at the boundary
  // rather than reaching GitLab as an empty GIT_BRANCH_DEPLOY.
  it('rejects a partial sync without a branch', () => {
    const result = SyncRepositorySchema.safeParse({ syncAllBranches: false })

    expect(result.success).toBe(false)
  })

  it('rejects a missing syncAllBranches', () => {
    const result = SyncRepositorySchema.safeParse({ branchName: 'main' })

    expect(result.success).toBe(false)
  })
})
