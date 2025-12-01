import { describe, expect, it } from 'vitest'
import { faker } from '@faker-js/faker'
import { ZodError } from 'zod'
import type { Log, ProjectV2 } from '../index.js'
import { ClusterDetailsSchema, ClusterPrivacy, ClusterUsageSchema, EnvironmentSchema, LogSchema, ProjectSchemaV2, RepoSchema, StageSchema, UserSchema, descriptionMaxLength, instanciateSchema, parseZodError } from '../index.js'

describe('schemas utils', () => {
  it('should delete config in log', () => {
    const toParse: Log = {
      id: faker.string.uuid(),
      projectId: faker.string.uuid(),
      action: 'Create a log',
      // @ts-ignore la date doit être transformé en string
      createdAt: new Date(),
      // @ts-ignore la date doit être transformé en string
      updatedAt: new Date(),
      data: {
        args: {},
        failed: false,
        config: {},
      },
      requestId: faker.string.uuid(),
      userId: faker.string.uuid(),
    }
    const parsed = structuredClone(toParse)
    // @ts-ignore la date doit être transformé en string
    parsed.createdAt = parsed.createdAt.toISOString()
    // @ts-ignore
    parsed.updatedAt = parsed.updatedAt.toISOString()
    // @ts-ignore
    delete parsed.data.config
    expect(LogSchema
      .safeParse(toParse))
      .toStrictEqual({ data: parsed, success: true })
  })

  it('should not validate an undefined object', () => {
    // @ts-ignore
    expect(RepoSchema.safeParse(undefined).error).toBeInstanceOf(ZodError)
  })

  it('should validate a correct repository schema', () => {
    const toParse = {
      id: faker.string.uuid(),
      projectId: faker.string.uuid(),
      internalRepoName: 'candilib',
      externalRepoUrl: 'https://github.com/LAB-MI/candilibV2.git',
      externalToken: 'eddddsqsq-_',
      isPrivate: true,
      isAutoSynced: false,
      isInfra: false,
      externalUserName: 'clai+re-nlet_',
    }

    expect(RepoSchema
      .omit({ createdAt: true, updatedAt: true })
      .safeParse(toParse))
      .toStrictEqual({ data: toParse, success: true })
  })

  it('should validate a correct environment schema', () => {
    const toParse = {
      id: faker.string.uuid(),
      name: faker.lorem.word({ length: { min: 2, max: 10 } }),
      cpu: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
      gpu: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
      memory: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
      projectId: faker.string.uuid(),
      clusterId: faker.string.uuid(),
      stageId: faker.string.uuid(),
    }

    expect(EnvironmentSchema
      .omit({ createdAt: true, updatedAt: true })
      .safeParse(toParse))
      .toStrictEqual({ data: toParse, success: true })
  })

  it('should validate a correct project schema', () => {
    const toParse: ProjectV2 = {
      id: faker.string.uuid(),
      name: faker.lorem.word({ length: { min: 2, max: 10 } }),
      slug: faker.lorem.word({ length: { min: 2, max: 10 } }),
      limitless: false,
      hprodCpu: faker.number.int({ min: 0, max: 1000 }),
      hprodGpu: faker.number.int({ min: 0, max: 1000 }),
      hprodMemory: faker.number.int({ min: 0, max: 1000 }),
      prodCpu: faker.number.int({ min: 0, max: 1000 }),
      prodGpu: faker.number.int({ min: 0, max: 1000 }),
      prodMemory: faker.number.int({ min: 0, max: 1000 }),
      description: '',
      status: 'created',
      locked: false,
      clusterIds: [],
      // @ts-ignore la date doit être transformé en string
      updatedAt: new Date(),
      // @ts-ignore la date doit être transformé en string
      createdAt: new Date(),
      members: [],
      owner: {
        // @ts-ignore la date doit être transformé en string
        createdAt: new Date(),
        // @ts-ignore la date doit être transformé en string
        updatedAt: new Date(),
        email: 'invalid-email@mais-pas-grave',
        firstName: faker.person.firstName(),
        id: faker.string.uuid(),
        lastName: faker.person.lastName(),
        type: 'human',
      },
      everyonePerms: '1',
      ownerId: faker.string.uuid(),
      roles: [],
      lastSuccessProvisionningVersion: null,
    }
    const parsed = structuredClone(toParse)
    // @ts-ignore la date doit être transformé en string
    parsed.createdAt = parsed.createdAt.toISOString()
    // @ts-ignore
    parsed.updatedAt = parsed.updatedAt.toISOString()
    // @ts-ignore
    parsed.owner.updatedAt = parsed.owner.updatedAt.toISOString()
    // @ts-ignore
    parsed.owner.createdAt = parsed.owner.createdAt.toISOString()
    expect(ProjectSchemaV2.safeParse(toParse)).toStrictEqual({ data: parsed, success: true })
  })

  it('should validate a correct user schema', () => {
    const toParse = {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      adminRoleIds: [],
      updatedAt: new Date(),
      createdAt: new Date(),
      type: 'human',
    }
    const parsed = structuredClone(toParse)
    // @ts-ignore la date doit être transformé en string
    parsed.createdAt = parsed.createdAt.toISOString()
    // @ts-ignore
    parsed.updatedAt = parsed.updatedAt.toISOString()
    expect(UserSchema.safeParse(toParse)).toStrictEqual({ data: parsed, success: true })
  })

  it('should validate a correct stage schema', () => {
    const toParse = {
      id: faker.string.uuid(),
      name: faker.lorem.word({ length: { min: 2, max: 10 } }),
      clusterIds: [],
    }

    expect(StageSchema.safeParse(toParse)).toStrictEqual({ data: toParse, success: true })
  })

  it('should validate a repo business schema', () => {
    const toParse = {
      id: faker.string.uuid(),
      projectId: faker.string.uuid(),
      internalRepoName: 'candilib',
      externalRepoUrl: 'https://github.com/LAB-MI/candilibV2.git',
      externalUserName: 'clairenlet',
      externalToken: 'myToken',
      isPrivate: true,
      isAutoSynced: true,
      isInfra: false,
    }

    expect(RepoSchema
      .omit({ createdAt: true, updatedAt: true })
      .safeParse(toParse))
      .toStrictEqual({ data: toParse, success: true })
  })

  it('should validate an internal dedicated cluster details schema', () => {
    const toParse = {
      id: faker.string.uuid(),
      label: 'cluster',
      external: false,
      clusterResources: true,
      infos: 'Infos du cluster',
      privacy: ClusterPrivacy.DEDICATED,
      cpu: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
      gpu: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
      memory: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
      zoneId: faker.string.uuid(),
      stageIds: [faker.string.uuid(), faker.string.uuid()],
      projectIds: [faker.string.uuid(), faker.string.uuid()],
      kubeconfig: {
        user: {},
        cluster: {
          tlsServerName: 'blabla',
        },
      },
    }

    expect(ClusterDetailsSchema
      .safeParse(toParse))
      .toStrictEqual({ data: toParse, success: true })
  })

  it('should validate an external public cluster details schema', () => {
    const toParse = {
      id: faker.string.uuid(),
      label: 'cluster',
      external: true,
      clusterResources: true,
      privacy: ClusterPrivacy.PUBLIC,
      cpu: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
      gpu: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
      memory: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
      zoneId: faker.string.uuid(),
      stageIds: [faker.string.uuid(), faker.string.uuid()],
      kubeconfig: {
        user: {},
        cluster: {
          tlsServerName: 'blabla',
        },
      },
    }

    expect(ClusterDetailsSchema
      .safeParse(toParse))
      .toStrictEqual({ data: { ...toParse, infos: '' }, success: true })
  })

  it('should validate a cluster usage schema', () => {
    const toParse = {
      cpu: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
      gpu: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
      memory: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
    }

    expect(ClusterUsageSchema
      .safeParse(toParse))
      .toStrictEqual({ data: toParse, success: true })
  })

  it('should not validate a repository schema with wrong internal repo name', () => {
    const toParse = {
      id: faker.string.uuid(),
      projectId: faker.string.uuid(),
      internalRepoName: '-candilib',
      externalRepoUrl: 'https://github.com/LAB-MI/candilibV2.git',
      isPrivate: false,
      isAutoSynced: false,
      isInfra: false,
    }

    // @ts-ignore
    expect(parseZodError(RepoSchema
      .safeParse(toParse)
      .error))
      .toMatch('Le nom du dépôt ne doit contenir ni majuscules, ni espaces, ni caractères spéciaux hormis le trait d\'union, et doit commencer et se terminer par un caractère alphanumérique at "internalRepoName"')

    toParse.internalRepoName = 'candilib-'

    // @ts-ignore
    expect(parseZodError(RepoSchema
      .safeParse(toParse)
      .error))
      .toMatch('Le nom du dépôt ne doit contenir ni majuscules, ni espaces, ni caractères spéciaux hormis le trait d\'union, et doit commencer et se terminer par un caractère alphanumérique at "internalRepoName"')

    toParse.internalRepoName = 'candiLib'

    // @ts-ignore
    expect(parseZodError(RepoSchema
      .omit({ createdAt: true, updatedAt: true })
      .safeParse(toParse)
      .error))
      .toMatch('Le nom du dépôt ne doit contenir ni majuscules, ni espaces, ni caractères spéciaux hormis le trait d\'union, et doit commencer et se terminer par un caractère alphanumérique at "internalRepoName"')

    toParse.internalRepoName = 'candi-lib'
    expect(RepoSchema
      .omit({ createdAt: true, updatedAt: true })
      .safeParse(toParse))
      .toStrictEqual({ data: toParse, success: true })
  })

  it('should not validate a too short project name', () => {
    const toParse = {
      id: faker.string.uuid(),
      name: faker.string.alpha({ casing: 'lower' }),
      status: 'created',
      locked: false,
      description: '',
      createdAt: (new Date()).toISOString(),
      updatedAt: (new Date()).toISOString(),
      clusterIds: [],
    }

    // @ts-ignore
    expect(parseZodError(ProjectSchemaV2
      .safeParse(toParse)
      .error))
      .toMatch('Validation error: String must contain at least 2 character(s) at "name"')
  })

  it('should not validate a too long project name', () => {
    const toParse = {
      id: faker.string.uuid(),
      name: faker.string.alpha({ length: 24, casing: 'lower' }),
      status: 'created',
      locked: false,
      description: '',
      createdAt: (new Date()).toISOString(),
      updatedAt: (new Date()).toISOString(),
      clusterIds: [],
    }

    // @ts-ignore
    expect(parseZodError(ProjectSchemaV2
      .safeParse(toParse)
      .error))
      .toMatch('Validation error: String must contain at most 20 character(s) at "name"')
  })

  it('should not validate a too long project description', () => {
    const toParse = {
      id: faker.string.uuid(),
      name: 'candilib',
      description: faker.string.alpha(descriptionMaxLength + 1),
      status: 'created',
      locked: false,
      createdAt: (new Date()).toISOString(),
      updatedAt: (new Date()).toISOString(),
      clusterIds: [],
    }

    expect(ProjectSchemaV2
      .safeParse(toParse)
      .error).toBeInstanceOf(ZodError)
  })

  it('should validate a single key with given schema', () => {
    const toParse = { internalRepoName: 'candilib' }

    expect(RepoSchema
      .pick({ internalRepoName: true })
      .safeParse(toParse))
      .toStrictEqual({ data: toParse, success: true })
  })

  it('should not validate a single key with given schema', () => {
    const toParse = { internalRepoName: 'candi lib' }

    expect(RepoSchema
      .omit({ createdAt: true, updatedAt: true })
      .pick({ internalRepoName: true })
      .safeParse(toParse)
      // @ts-ignore
      .error).toBeInstanceOf(ZodError)
  })

  it('should return truthy schema', () => {
    expect(instanciateSchema(RepoSchema.omit({ id: true }), true)).toMatchObject({
      internalRepoName: true,
      externalRepoUrl: true,
      externalToken: true,
      isPrivate: true,
      isInfra: true,
      externalUserName: true,
      projectId: true,
    })
  })

  it('should return true schema', () => {
    expect(instanciateSchema(RepoSchema.omit({ id: true }), true)).toMatchObject({
      internalRepoName: true,
      externalRepoUrl: true,
      externalToken: true,
      isPrivate: true,
      isInfra: true,
      externalUserName: true,
      projectId: true,
    })
  })
})
