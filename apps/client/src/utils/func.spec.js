import { identity, schemaValidator } from '@/utils/func.js'
import { repoSchema } from 'shared/src/projects/schema.js'

describe('func', () => {
  it('Should return identity', () => {
    expect(identity('Test')).toStrictEqual('Test')
  })

  it('Should validate undefined schema', () => {
    expect(schemaValidator(repoSchema, undefined)).toStrictEqual({})
  })

  it('Should validate correct schema', () => {
    expect(schemaValidator(repoSchema, {
      internalRepoName: 'candilib',
      externalRepoUrl: 'https://candilib.com',
      externalToken: 'eddddsqsq',
      isPrivate: true,
      externalUserName: 'clairenlet',
    })).toStrictEqual({})
  })

  it('Should not validate schema and send specific error', () => {
    expect(schemaValidator(repoSchema, {
      internalRepoName: 'candilib',
      externalRepoUrl: 'https://candilib.com',
      isPrivate: true,
      externalUserName: 'clairenlet',
    })).toStrictEqual({ externalToken: '"externalToken" is required' })
  })
})
