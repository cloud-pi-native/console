import { describe, it, expect } from 'vitest'
import { keycloakConf } from './keycloak.js'

describe('keycloak', () => {
  it('Should map keycloak user object to DSO user object without groups', () => {
    const payload = {
      sub: 'thisIsAnId',
      email: 'test@test.com',
      given_name: 'Jean',
      family_name: 'DUPOND',
    }
    const desired = {
      id: 'thisIsAnId',
      email: 'test@test.com',
      firstName: 'Jean',
      lastName: 'DUPOND',
    }

    const transformed = keycloakConf.userPayloadMapper(payload)

    expect(transformed).toMatchObject(desired)
  })

  it('Should map keycloak user object to DSO user object with groups', () => {
    const payload = {
      sub: 'thisIsAnId',
      email: 'test@test.com',
      given_name: 'Jean',
      family_name: 'DUPOND',
      groups: ['group1'],
    }
    const desired = {
      id: 'thisIsAnId',
      email: 'test@test.com',
      firstName: 'Jean',
      lastName: 'DUPOND',
      groups: ['group1'],
    }

    const transformed = keycloakConf.userPayloadMapper(payload)

    expect(transformed).toMatchObject(desired)
  })
})
