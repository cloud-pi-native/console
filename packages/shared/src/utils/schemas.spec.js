import { describe, it, expect } from 'vitest'
import { faker } from '@faker-js/faker'
import { schemaValidator, isValid, instanciateSchema } from './schemas.js'
import { repoSchema } from '../schemas/repository.js'

describe('Schemas utils', () => {
  it('Should validate undefined schema', () => {
    expect(schemaValidator(repoSchema, undefined)).toStrictEqual({})
  })

  it('Should validate correct schema', () => {
    expect(schemaValidator(repoSchema, {
      id: faker.datatype.uuid(),
      internalRepoName: 'candilib',
      externalRepoUrl: 'https://github.com/LAB-MI/candilibV2.git',
      externalToken: 'eddddsqsq',
      isPrivate: true,
      isInfra: false,
      externalUserName: 'clairenlet',
      status: 'created',
    })).toStrictEqual({})
  })

  it('Should not validate schema and send specific error', () => {
    expect(schemaValidator(repoSchema, {
      id: faker.datatype.uuid(),
      internalRepoName: 'candilib',
      externalRepoUrl: 'https://github.com/LAB-MI/candilibV2.git',
      isPrivate: true,
      isInfra: false,
      externalUserName: 'clairenlet',
      status: 'created',
    })).toStrictEqual({ externalToken: '"externalToken" is required' })
  })

  it('Should validate a single key with given schema', () => {
    expect(isValid(repoSchema, {
      id: faker.datatype.uuid(),
      internalRepoName: 'candilib',
      externalRepoUrl: 'https://github.com/LAB-MI/candilibV2.git',
      isPrivate: true,
      isInfra: false,
      externalUserName: 'clairenlet',
      status: 'created',
    }, 'internalRepoName')).toStrictEqual(true)
  })

  it('Should not validate a single key with given schema', () => {
    expect(isValid(repoSchema, {
      id: faker.datatype.uuid(),
      internalRepoName: 'candi lib',
      externalRepoUrl: 'https://github.com/LAB-MI/candilibV2.git',
      isPrivate: true,
      isInfra: false,
      externalUserName: 'clairenlet',
      status: 'created',
    }, 'internalRepoName')).toStrictEqual(false)
  })

  it('Should return truthy schema', () => {
    expect(instanciateSchema({ schema: repoSchema }, true)).toStrictEqual({
      id: true,
      internalRepoName: true,
      externalRepoUrl: true,
      externalToken: true,
      isPrivate: true,
      isInfra: true,
      externalUserName: true,
      status: true,
    })
  })

  it('Should return undefined schema', () => {
    expect(instanciateSchema({ schema: repoSchema }, undefined)).toStrictEqual({
      id: undefined,
      internalRepoName: undefined,
      externalRepoUrl: undefined,
      externalToken: undefined,
      isPrivate: undefined,
      isInfra: undefined,
      externalUserName: undefined,
      status: undefined,
    })
  })

  it('Should return string schema', () => {
    expect(instanciateSchema({ schema: repoSchema }, 'test')).toStrictEqual({
      id: 'test',
      internalRepoName: 'test',
      externalRepoUrl: 'test',
      externalToken: 'test',
      isPrivate: 'test',
      isInfra: 'test',
      externalUserName: 'test',
      status: 'test',
    })
  })
})
