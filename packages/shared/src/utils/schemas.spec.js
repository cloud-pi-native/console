import { describe, it, expect } from 'vitest'
import { schemaValidator, isValid, getTruthySchema } from './schemas.js'
import { repoSchema } from '../schemas/repo.js'

describe('Schemas utils', () => {
  it('Should validate undefined schema', () => {
    expect(schemaValidator(repoSchema, undefined)).toStrictEqual({})
  })

  it('Should validate correct schema', () => {
    expect(schemaValidator(repoSchema, {
      internalRepoName: 'candilib',
      externalRepoUrl: 'https://github.com/LAB-MI/candilibV2',
      externalToken: 'eddddsqsq',
      isPrivate: true,
      externalUserName: 'clairenlet',
    })).toStrictEqual({})
  })

  it('Should not validate schema and send specific error', () => {
    expect(schemaValidator(repoSchema, {
      internalRepoName: 'candilib',
      externalRepoUrl: 'https://github.com/LAB-MI/candilibV2',
      isPrivate: true,
      externalUserName: 'clairenlet',
    })).toStrictEqual({ externalToken: '"externalToken" is required' })
  })

  it('Should validate a single key with given schema', () => {
    expect(isValid(repoSchema, {
      internalRepoName: 'candilib',
      externalRepoUrl: 'https://github.com/LAB-MI/candilibV2',
      isPrivate: true,
      externalUserName: 'clairenlet',
    }, 'internalRepoName')).toStrictEqual(true)
  })

  it('Should not validate a single key with given schema', () => {
    expect(isValid(repoSchema, {
      internalRepoName: 'candi lib',
      externalRepoUrl: 'https://github.com/LAB-MI/candilibV2',
      isPrivate: true,
      externalUserName: 'clairenlet',
    }, 'internalRepoName')).toStrictEqual(false)
  })

  it('Should return truthy schema', () => {
    expect(getTruthySchema(({ schema: repoSchema }))).toStrictEqual({
      internalRepoName: true,
      externalRepoUrl: true,
      externalToken: true,
      isPrivate: true,
      externalUserName: true,
    })
  })
})
