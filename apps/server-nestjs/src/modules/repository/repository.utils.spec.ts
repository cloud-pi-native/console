import type { CreateRepository, UpdateRepository } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'
import { describe, expect, it } from 'vitest'
import { buildRepositoryCreateData, buildRepositoryUpdateData, parseRepositoryCredentialUpdate } from './repository.utils'

describe('buildRepositoryCreateData', () => {
  it('maps a private repository, keeping the username and never persisting the token', () => {
    const projectId = faker.string.uuid()
    const data = {
      internalRepoName: faker.string.alphanumeric(8).toLowerCase(),
      externalRepoUrl: `https://${faker.internet.domainName()}/repo.git`,
      externalUserName: faker.internet.username(),
      externalToken: faker.string.alphanumeric(16),
      isInfra: true,
      isPrivate: true,
      deployRevision: faker.git.branch(),
      deployPath: faker.system.directoryPath(),
      helmValuesFiles: `${faker.word.noun()}.yaml`,
    } satisfies CreateRepository

    const result = buildRepositoryCreateData(projectId, data)

    expect(result).toEqual({
      projectId,
      internalRepoName: data.internalRepoName,
      externalRepoUrl: data.externalRepoUrl,
      externalUserName: data.externalUserName,
      isInfra: true,
      isPrivate: true,
      deployRevision: data.deployRevision,
      deployPath: data.deployPath,
      helmValuesFiles: data.helmValuesFiles,
    })
    expect(result).not.toHaveProperty('externalToken')
  })

  it('maps a public repository, falling back to empty strings for the absent url and username', () => {
    const projectId = faker.string.uuid()
    // Already-parsed body: the schema has defaulted the deployment fields at the boundary.
    const data = {
      internalRepoName: faker.string.alphanumeric(8).toLowerCase(),
      externalRepoUrl: '',
      isInfra: false,
      isPrivate: false,
      deployRevision: 'HEAD',
      deployPath: '.',
      helmValuesFiles: '',
    } satisfies CreateRepository

    const result = buildRepositoryCreateData(projectId, data)

    expect(result).toEqual({
      projectId,
      internalRepoName: data.internalRepoName,
      externalRepoUrl: '',
      externalUserName: '',
      isInfra: false,
      isPrivate: false,
      deployRevision: 'HEAD',
      deployPath: '.',
      helmValuesFiles: '',
    })
    expect(result).not.toHaveProperty('externalToken')
  })
})

describe('buildRepositoryUpdateData', () => {
  it('never persists the external token', () => {
    const data = { externalToken: faker.string.alphanumeric(16), isPrivate: true } satisfies UpdateRepository

    const result = buildRepositoryUpdateData(data)

    expect(result).not.toHaveProperty('externalToken')
    expect(result).toEqual({ isPrivate: true })
  })

  it('keeps the stored external username when the repository becomes public', () => {
    const data = { isPrivate: false, externalUserName: faker.internet.username() } satisfies UpdateRepository

    const result = buildRepositoryUpdateData(data)

    expect(result).toEqual({ isPrivate: false })
    expect(result).not.toHaveProperty('externalUserName')
  })

  it('updates the external username when the repository stays private', () => {
    const externalUserName = faker.internet.username()
    const data = { isPrivate: true, externalUserName } satisfies UpdateRepository

    const result = buildRepositoryUpdateData(data)

    expect(result).toEqual({ isPrivate: true, externalUserName })
  })

  it('passes through the other updatable fields', () => {
    const data = {
      externalRepoUrl: `https://${faker.internet.domainName()}/repo.git`,
      isInfra: true,
      deployRevision: faker.git.branch(),
      deployPath: faker.system.directoryPath(),
      helmValuesFiles: `${faker.word.noun()}.yaml`,
    } satisfies UpdateRepository

    const result = buildRepositoryUpdateData(data)

    expect(result).toEqual({
      externalRepoUrl: data.externalRepoUrl,
      isInfra: true,
      deployRevision: data.deployRevision,
      deployPath: data.deployPath,
      helmValuesFiles: data.helmValuesFiles,
    })
  })
})

describe('parseRepositoryCredentialUpdate', () => {
  it('returns "set" when a new token is supplied', () => {
    const externalToken = faker.string.alphanumeric(16)

    expect(parseRepositoryCredentialUpdate({ isPrivate: true, externalToken }))
      .toEqual({ kind: 'set', externalToken })
  })

  it('returns "clear" when the repository is turned public', () => {
    expect(parseRepositoryCredentialUpdate({ isPrivate: false, externalToken: faker.string.alphanumeric(16) }))
      .toEqual({ kind: 'clear' })
  })

  it('returns "keep" when the body carries no token', () => {
    expect(parseRepositoryCredentialUpdate({ deployRevision: faker.git.branch() }))
      .toEqual({ kind: 'keep' })
  })

  it('treats an empty token as "keep" (unchanged), never a write', () => {
    expect(parseRepositoryCredentialUpdate({ isPrivate: true, externalToken: '' }))
      .toEqual({ kind: 'keep' })
  })
})
