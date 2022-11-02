import { identity, schemaValidator } from '@/utils/func.js'
import { repoSchema } from 'shared/src/projects/schema.js'
import { it } from 'vitest'

describe('func', () => {
  it('Should return identity', () => {
    expect(identity('Test')).toStrictEqual('Test')
  })

  it('Should validate undefined schema', () => {
    expect(schemaValidator(repoSchema, undefined)).toStrictEqual({})
  })

  it('Should validate correct schema', () => {
    expect(schemaValidator(repoSchema, {
      gitName: 'candilib',
      gitSourceName: 'https://candilib.com',
      gitToken: 'eddddsqsq',
      isPrivate: true,
      userName: 'clairenlet',
    })).toStrictEqual({})
  })

  it('Should not validate schema and send specific error', () => {
    expect(schemaValidator(repoSchema, {
      gitName: 'candilib',
      gitSourceName: 'https://candilib.com',
      isPrivate: true,
      userName: 'clairenlet',
    })).toStrictEqual({ gitToken: '"gitToken" is required' })
  })
})
