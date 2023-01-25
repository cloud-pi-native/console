import { describe, it, expect } from 'vitest'
import { faker } from '@faker-js/faker'
import { schemaValidator, isValid, instanciateSchema } from './schemas.js'
import {
  repoSchema,
  environmentSchema,
  permissionSchema,
  projectSchema,
  userSchema,
} from '../index.js'

describe('Schemas utils', () => {
  it('Should validate undefined schema', () => {
    expect(schemaValidator(repoSchema, undefined)).toStrictEqual({})
  })

  it('Should validate a correct repository schema', () => {
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

  it('Should validate a correct environment schema', () => {
    expect(schemaValidator(environmentSchema, {
      id: faker.datatype.uuid(),
      name: 'dev',
      projectId: faker.datatype.uuid(),
      status: 'created',
    })).toStrictEqual({})
  })

  it('Should validate a correct permission schema', () => {
    expect(schemaValidator(permissionSchema, {
      id: faker.datatype.uuid(),
      userId: faker.datatype.uuid(),
      environmentId: faker.datatype.uuid(),
      level: 0,
    })).toStrictEqual({})
  })

  it('Should validate a correct project schema', () => {
    expect(schemaValidator(projectSchema, {
      id: faker.datatype.uuid(),
      name: faker.datatype.uuid(),
      ownerId: faker.datatype.uuid(),
      organization: faker.datatype.uuid(),
      usersId: [faker.datatype.uuid(), faker.datatype.uuid()],
      status: 'created',
      locked: false,
    })).toStrictEqual({})
  })

  it('Should validate a correct user schema', () => {
    expect(schemaValidator(userSchema, {
      id: faker.datatype.uuid(),
      email: faker.internet.email(),
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
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
