import { describe, expect, it } from 'vitest'
import { ClusterBusinessSchema, ClusterPrivacy, EnvironmentSchema, OrganizationSchema, PermissionSchema, ProjectSchema, QuotaSchema, RepoBusinessSchema, RepoSchema, QuotaStageSchema, StageSchema, UserSchema, descriptionMaxLength, instanciateSchema, parseZodError } from '../index.js'
import { faker } from '@faker-js/faker'
import { ZodError } from 'zod'

describe('Schemas utils', () => {
  it('Should not validate an undefined object', () => {
    // @ts-ignore
    expect(RepoBusinessSchema.safeParse(undefined).error).toBeInstanceOf(ZodError)
  })

  it('Should validate a correct repository schema', () => {
    const toParse = {
      id: faker.string.uuid(),
      projectId: faker.string.uuid(),
      internalRepoName: 'candilib',
      externalRepoUrl: 'https://github.com/LAB-MI/candilibV2.git',
      externalToken: 'eddddsqsq-_',
      isPrivate: true,
      isInfra: false,
      externalUserName: 'clai+re-nlet_',
    }

    expect(RepoBusinessSchema.safeParse(toParse)).toStrictEqual({ data: toParse, success: true })
  })

  it('Should validate a correct environment schema', () => {
    const toParse = {
      id: faker.string.uuid(),
      name: faker.lorem.word({ length: { min: 2, max: 10 } }),
      projectId: faker.string.uuid(),
      clusterId: faker.string.uuid(),
      quotaStageId: faker.string.uuid(),
    }

    expect(EnvironmentSchema.omit({ permissions: true }).safeParse(toParse)).toStrictEqual({ data: toParse, success: true })
  })

  it('Should validate a correct environment schema with permissions', () => {
    const toParse = {
      id: faker.string.uuid(),
      name: faker.lorem.word({ length: { min: 2, max: 10 } }),
      projectId: faker.string.uuid(),
      clusterId: faker.string.uuid(),
      quotaStageId: faker.string.uuid(),
      permissions: [{
        id: faker.string.uuid(),
        environmentId: faker.string.uuid(),
        userId: faker.string.uuid(),
        level: faker.number.int({ min: 0, max: 2 }),
      }],
    }

    expect(EnvironmentSchema.safeParse(toParse)).toStrictEqual({ data: toParse, success: true })
  })

  it('Should validate a correct permission schema', () => {
    const toParse = {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      environmentId: faker.string.uuid(),
      level: 0,
    }

    expect(PermissionSchema.safeParse(toParse)).toStrictEqual({ data: toParse, success: true })
  })

  it('Should validate a correct organization schema', () => {
    const toParse = {
      id: faker.string.uuid(),
      name: faker.lorem.word({ length: { min: 2, max: 10 } }),
      label: faker.company.name(),
      active: faker.datatype.boolean(),
    }

    expect(OrganizationSchema.safeParse(toParse)).toStrictEqual({ data: toParse, success: true })
  })

  it('Should validate a correct organization schema with external data', () => {
    const toParse = {
      id: faker.string.uuid(),
      source: faker.lorem.word(),
      name: faker.lorem.word({ length: { min: 2, max: 10 } }),
      label: faker.company.name(),
      active: faker.datatype.boolean(),
    }

    expect(OrganizationSchema.safeParse(toParse)).toStrictEqual({ data: toParse, success: true })
  })

  it('Should validate a correct project schema', () => {
    const toParse = {
      id: faker.string.uuid(),
      name: faker.lorem.word({ length: { min: 2, max: 10 } }),
      organizationId: faker.string.uuid(),
      status: 'created',
      locked: false,
    }

    expect(ProjectSchema.safeParse(toParse)).toStrictEqual({ data: toParse, success: true })
  })

  it('Should validate a correct user schema', () => {
    const toParse = {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    }

    expect(UserSchema.safeParse(toParse)).toStrictEqual({ data: toParse, success: true })
  })

  it('Should validate a correct quota schema', () => {
    const toParse = {
      id: faker.string.uuid(),
      name: faker.lorem.word({ length: { min: 2, max: 10 } }),
      memory: '12Gi',
      cpu: faker.number.int({ min: 0 }),
      isPrivate: faker.datatype.boolean(),
    }

    expect(QuotaSchema.safeParse(toParse)).toStrictEqual({ data: toParse, success: true })
  })

  it('Should validate a correct stage schema', () => {
    const toParse = {
      id: faker.string.uuid(),
      name: faker.lorem.word({ length: { min: 2, max: 10 } }),
    }

    expect(StageSchema.safeParse(toParse)).toStrictEqual({ data: toParse, success: true })
  })

  it('Should validate a correct quotaStage schema', () => {
    const toParse = {
      id: faker.string.uuid(),
      quotaId: faker.string.uuid(),
      stageId: faker.string.uuid(),
      status: faker.lorem.word(),
    }

    expect(QuotaStageSchema.safeParse(toParse)).toStrictEqual({ data: toParse, success: true })
  })

  it('Should not validate an organization schema with wrong external data', () => {
    const toParse = {
      id: faker.string.uuid(),
      source: [],
      name: faker.lorem.word({ length: { min: 2, max: 10 } }),
      label: faker.company.name(),
      active: faker.datatype.boolean(),
    }

    // @ts-ignore
    expect(parseZodError(OrganizationSchema
      .safeParse(toParse)
      .error))
      .toMatch('Validation error: Expected string, received array at "source"')
  })

  it('Should validate a repo business schema', () => {
    const toParse = {
      id: faker.string.uuid(),
      projectId: faker.string.uuid(),
      internalRepoName: 'candilib',
      externalRepoUrl: 'https://github.com/LAB-MI/candilibV2.git',
      externalUserName: 'clairenlet',
      externalToken: 'myToken',
      isPrivate: true,
      isInfra: false,
    }

    expect(RepoBusinessSchema
      .safeParse(toParse))
      .toStrictEqual({ data: toParse, success: true })
  })

  it('Should not validate a repo business schema and send specific error', () => {
    const toParse = {
      id: faker.string.uuid(),
      projectId: faker.string.uuid(),
      internalRepoName: 'candilib',
      externalRepoUrl: 'https://github.com/LAB-MI/candilibV2.git',
      isPrivate: true,
      isInfra: false,
      externalUserName: 'clairenlet',
    }

    // @ts-ignore
    expect(parseZodError(RepoBusinessSchema
      .safeParse(toParse)
      .error))
      .toMatch('Validation error: Si le dépôt est privé, vous devez renseignez les nom de propriétaire et token associés.')
  })

  it('Should validate a cluster business schema, case 1', () => {
    const toParse = {
      id: faker.string.uuid(),
      infos: null,
      label: 'cluster',
      clusterResources: true,
      secretName: 'a',
      privacy: ClusterPrivacy.DEDICATED,
      zoneId: faker.string.uuid(),
      stageIds: [faker.string.uuid(), faker.string.uuid()],
      projectIds: [faker.string.uuid(), faker.string.uuid()],
      user: {},
      cluster: {
        tlsServerName: 'blabla',
      },
    }

    expect(ClusterBusinessSchema
      .safeParse(toParse))
      .toStrictEqual({ data: toParse, success: true })
  })

  it('Should validate a cluster business schema, case 2', () => {
    const toParse = {
      id: faker.string.uuid(),
      infos: null,
      label: 'cluster',
      secretName: 'a',
      clusterResources: true,
      privacy: ClusterPrivacy.PUBLIC,
      zoneId: faker.string.uuid(),
      stageIds: [faker.string.uuid(), faker.string.uuid()],
      projectIds: [],
      user: {},
      cluster: {
        tlsServerName: 'blabla',
      },
    }

    expect(ClusterBusinessSchema
      .safeParse(toParse))
      .toStrictEqual({ data: toParse, success: true })
  })

  it('Should not validate a repository schema with wrong internal repo name', () => {
    const toParse = {
      id: faker.string.uuid(),
      projectId: faker.string.uuid(),
      internalRepoName: '-candilib',
      externalRepoUrl: 'https://github.com/LAB-MI/candilibV2.git',
      isPrivate: false,
      isInfra: false,
    }

    // @ts-ignore
    expect(parseZodError(RepoBusinessSchema
      .safeParse(toParse)
      .error))
      .toMatch('Validation error: failed regex test at "internalRepoName"')

    toParse.internalRepoName = 'candilib-'

    // @ts-ignore
    expect(parseZodError(RepoBusinessSchema
      .safeParse(toParse)
      .error))
      .toMatch('Validation error: failed regex test at "internalRepoName"')

    toParse.internalRepoName = 'candiLib'

    // @ts-ignore
    expect(parseZodError(RepoBusinessSchema
      .safeParse(toParse)
      .error))
      .toMatch('Validation error: failed regex test at "internalRepoName"')

    toParse.internalRepoName = 'candi-lib'
    expect(RepoBusinessSchema
      .safeParse(toParse))
      .toStrictEqual({ data: toParse, success: true })
  })

  it('Should not validate a too short project name', () => {
    const toParse = {
      id: faker.string.uuid(),
      name: faker.string.alpha({ casing: 'lower' }),
      organizationId: faker.string.uuid(),
      status: 'created',
      locked: false,
    }

    // @ts-ignore
    expect(parseZodError(ProjectSchema
      .safeParse(toParse)
      .error))
      .toMatch('Validation error: String must contain at least 2 character(s) at "name"')
  })

  it('Should not validate a too long project name', () => {
    const toParse = {
      id: faker.string.uuid(),
      name: faker.string.alpha({ length: 24, casing: 'lower' }),
      organizationId: faker.string.uuid(),
      status: 'created',
      locked: false,
    }

    // @ts-ignore
    expect(parseZodError(ProjectSchema
      .safeParse(toParse)
      .error))
      .toMatch('Validation error: String must contain at most 20 character(s) at "name"')
  })

  it('Should not validate a too long project description', () => {
    const toParse = {
      id: faker.string.uuid(),
      name: 'candilib',
      organizationId: faker.string.uuid(),
      description: faker.string.alpha(descriptionMaxLength + 1),
      status: 'created',
      locked: false,
    }

    // @ts-ignore
    expect(ProjectSchema
      .safeParse(toParse)
      .error).toBeInstanceOf(ZodError)
  })

  it('Should validate a single key with given schema', () => {
    const toParse = { internalRepoName: 'candilib' }

    expect(RepoSchema
      .pick({ internalRepoName: true })
      .safeParse(toParse))
      .toStrictEqual({ data: toParse, success: true })
  })

  it('Should not validate a single key with given schema', () => {
    const toParse = { internalRepoName: 'candi lib' }

    expect(RepoSchema
      .pick({ internalRepoName: true })
      .safeParse(toParse)
      // @ts-ignore
      .error).toBeInstanceOf(ZodError)
  })

  it('Should return truthy schema', () => {
    expect(instanciateSchema(RepoSchema.omit({ id: true }), true)).toStrictEqual({
      internalRepoName: true,
      externalRepoUrl: true,
      externalToken: true,
      isPrivate: true,
      isInfra: true,
      externalUserName: true,
      projectId: true,
    })
  })

  it('Should return undefined schema', () => {
    expect(instanciateSchema(RepoSchema.omit({ id: true }), undefined)).toStrictEqual({
      internalRepoName: undefined,
      externalRepoUrl: undefined,
      externalToken: undefined,
      isPrivate: undefined,
      isInfra: undefined,
      externalUserName: undefined,
      projectId: undefined,
    })
  })

  it('Should return string schema', () => {
    expect(instanciateSchema(RepoSchema.omit({ id: true }), 'test')).toStrictEqual({
      internalRepoName: 'test',
      externalRepoUrl: 'test',
      externalToken: 'test',
      isPrivate: 'test',
      isInfra: 'test',
      externalUserName: 'test',
      projectId: 'test',
    })
  })
})
