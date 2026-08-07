import type { RepoFormResult } from './repository-utils.js'
import { fakeToken } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'
import { describe, expect, it } from 'vitest'
import { toCreateRepositoryBody, toUpdateRepositoryBody } from './repository-utils.js'

function makeFormResult(overrides: RepoFormResult = {}): RepoFormResult {
  return {
    internalRepoName: 'candilib',
    externalRepoUrl: 'https://github.com/cloud-pi-native/console.git',
    isPrivate: false,
    isInfra: false,
    isStandalone: false,
    ...overrides,
  }
}

describe('toCreateRepositoryBody', () => {
  it('should build a public repository body without credentials', () => {
    const body = toCreateRepositoryBody(makeFormResult({ externalUserName: 'this-is-tobi', externalToken: 'secret' }))

    expect(body).toEqual({
      internalRepoName: 'candilib',
      externalRepoUrl: 'https://github.com/cloud-pi-native/console.git',
      isPrivate: false,
      isInfra: false,
      deployRevision: undefined,
      deployPath: undefined,
      helmValuesFiles: undefined,
    })
  })

  it('should carry the credentials of a private repository', () => {
    const body = toCreateRepositoryBody(makeFormResult({ isPrivate: true, externalUserName: 'this-is-tobi', externalToken: 'secret' }))

    expect(body).toMatchObject({ isPrivate: true, externalUserName: 'this-is-tobi', externalToken: 'secret' })
  })

  it('should default the credentials of a private repository to empty strings', () => {
    const body = toCreateRepositoryBody(makeFormResult({ isPrivate: true }))

    expect(body).toMatchObject({ isPrivate: true, externalUserName: '', externalToken: '' })
  })

  it('should keep the deployment settings of an infra repository', () => {
    const body = toCreateRepositoryBody(makeFormResult({
      isInfra: true,
      deployRevision: 'main',
      deployPath: 'manifests/',
      helmValuesFiles: 'values/extra.yaml,values-<env>/custom.yaml',
    }))

    expect(body).toMatchObject({
      isInfra: true,
      deployRevision: 'main',
      deployPath: 'manifests/',
      helmValuesFiles: 'values/extra.yaml,values-<env>/custom.yaml',
    })
  })
})

describe('toUpdateRepositoryBody', () => {
  const persisted = {
    id: faker.string.uuid(),
    projectId: faker.string.uuid(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  it('should drop the fields the v2 route does not accept', () => {
    const body = toUpdateRepositoryBody(makeFormResult({ ...persisted }))

    expect(body).toEqual({
      externalRepoUrl: 'https://github.com/cloud-pi-native/console.git',
      isPrivate: false,
      isInfra: false,
    })
    expect(body).not.toHaveProperty('id')
    expect(body).not.toHaveProperty('projectId')
    expect(body).not.toHaveProperty('createdAt')
    expect(body).not.toHaveProperty('updatedAt')
    expect(body).not.toHaveProperty('internalRepoName')
    expect(body).not.toHaveProperty('isStandalone')
  })

  it('should omit an unchanged token, signalled by the fakeToken placeholder', () => {
    const body = toUpdateRepositoryBody(makeFormResult({ ...persisted, isPrivate: true, externalUserName: 'this-is-tobi', externalToken: fakeToken }))

    expect(body).not.toHaveProperty('externalToken')
    expect(body).toMatchObject({ isPrivate: true, externalUserName: 'this-is-tobi' })
  })

  it('should omit an empty token', () => {
    const body = toUpdateRepositoryBody(makeFormResult({ ...persisted, externalToken: '' }))

    expect(body).not.toHaveProperty('externalToken')
  })

  it('should send a token that was actually edited', () => {
    const body = toUpdateRepositoryBody(makeFormResult({ ...persisted, isPrivate: true, externalUserName: 'this-is-tobi', externalToken: 'new-secret' }))

    expect(body).toMatchObject({ externalToken: 'new-secret' })
  })
})
