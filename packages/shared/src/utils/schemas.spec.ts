import { describe, it, expect } from 'vitest'
import { faker } from '@faker-js/faker'
import { schemaValidator, isValid, instanciateSchema } from './schemas.js'
import {
  repoSchema,
  environmentSchema,
  permissionSchema,
  projectSchema,
  userSchema,
  organizationSchema,
} from '../index.js'
import { descriptionMaxLength } from '../schemas/project.js'

describe('Schemas utils', () => {
  it('Should validate undefined schema', () => {
    expect(schemaValidator(repoSchema, undefined)).toStrictEqual({})
  })

  it('Should validate a correct repository schema', () => {
    expect(schemaValidator(repoSchema, {
      id: faker.string.uuid(),
      internalRepoName: 'candilib',
      externalRepoUrl: 'https://github.com/LAB-MI/candilibV2.git',
      externalToken: 'eddddsqsq-_',
      isPrivate: true,
      isInfra: false,
      externalUserName: 'claire-nlet_',
      status: 'created',
    })).toStrictEqual({})
  })

  it('Should validate a correct environment schema', () => {
    expect(schemaValidator(environmentSchema, {
      id: faker.string.uuid(),
      name: 'dev',
      projectId: faker.string.uuid(),
      status: 'created',
    })).toStrictEqual({})
  })

  it('Should validate a correct permission schema', () => {
    expect(schemaValidator(permissionSchema, {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      environmentId: faker.string.uuid(),
      level: 0,
    })).toStrictEqual({})
  })

  it('Should validate a correct organization schema', () => {
    expect(schemaValidator(organizationSchema, {
      id: faker.string.uuid(),
      name: faker.word.noun({ length: { min: 2, max: 10 } }),
      label: faker.company.name(),
      active: faker.datatype.boolean(),
    })).toStrictEqual({})
  })

  it('Should validate a correct organization schema with external data', () => {
    expect(schemaValidator(organizationSchema, {
      id: faker.string.uuid(),
      source: faker.word.noun(),
      name: faker.word.noun({ length: { min: 2, max: 10 } }),
      label: faker.company.name(),
      active: faker.datatype.boolean(),
    })).toStrictEqual({})
  })

  it('Should validate a correct project schema', () => {
    expect(schemaValidator(projectSchema, {
      id: faker.string.uuid(),
      name: faker.lorem.slug(1),
      organizationId: faker.string.uuid(),
      status: 'created',
      locked: false,
    }, { context: { projectNameMaxLength: 23 } })).toStrictEqual({})
  })

  it('Should validate a correct user schema', () => {
    expect(schemaValidator(userSchema, {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    })).toStrictEqual({})
  })

  it('Should not validate an organization schema with wrong external data', () => {
    expect(schemaValidator(organizationSchema, {
      id: faker.string.uuid(),
      source: [],
      name: faker.word.noun({ length: { min: 2, max: 10 } }),
      label: faker.company.name(),
      active: faker.datatype.boolean(),
    })).toStrictEqual({ source: '"source" must be a string' })
  })

  it('Should not validate schema and send specific error', () => {
    expect(schemaValidator(repoSchema, {
      id: faker.string.uuid(),
      internalRepoName: 'candilib',
      externalRepoUrl: 'https://github.com/LAB-MI/candilibV2.git',
      isPrivate: true,
      isInfra: false,
      externalUserName: 'clairenlet',
      status: 'created',
    })).toStrictEqual({ externalToken: '"externalToken" is required' })
  })

  it('Should not validate a too short project name', () => {
    expect(schemaValidator(projectSchema, {
      id: faker.string.uuid(),
      name: faker.string.alpha(),
      organizationId: faker.string.uuid(),
      status: 'created',
      locked: false,
    }, { context: { projectNameMaxLength: 23 } })).toStrictEqual({ name: '"name" length must be at least 2 characters long' })
  })

  it('Should not validate a too long project name', () => {
    expect(schemaValidator(projectSchema, {
      id: faker.string.uuid(),
      name: faker.lorem.slug(10),
      organizationId: faker.string.uuid(),
      status: 'created',
      locked: false,
    }, { context: { projectNameMaxLength: 23 } })).toStrictEqual({ name: '"name" length must be less than or equal to ref:global:projectNameMaxLength characters long' })
  })

  it('Should not validate a too long project description', () => {
    expect(schemaValidator(projectSchema, {
      id: faker.string.uuid(),
      name: 'candilib',
      organizationId: faker.string.uuid(),
      description: faker.string.alpha(descriptionMaxLength + 1),
      status: 'created',
      locked: false,
    }, { context: { projectNameMaxLength: 23 } })).toStrictEqual({ description: '"description" length must be less than or equal to 280 characters long' })
  })

  it('Should validate a single key with given schema', () => {
    expect(isValid(repoSchema, {
      id: faker.string.uuid(),
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
      id: faker.string.uuid(),
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
      projectId: true,
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
      projectId: undefined,
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
      projectId: 'test',
      isInfra: 'test',
      externalUserName: 'test',
      status: 'test',
    })
  })
})
