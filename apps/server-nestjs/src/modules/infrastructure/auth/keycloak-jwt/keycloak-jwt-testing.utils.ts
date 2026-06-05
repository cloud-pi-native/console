import type { KeycloakPayload } from './keycloak-jwt.service'
import { generateKeyPairSync } from 'node:crypto'
import { faker } from '@faker-js/faker'
import { KeycloakPayloadSchema } from './keycloak-jwt.service'

export function makeKeycloakPayload(overrides: Partial<KeycloakPayload> = {}) {
  return KeycloakPayloadSchema.parse({
    sub: faker.string.uuid(),
    email: faker.internet.email().toLowerCase(),
    given_name: faker.person.firstName(),
    family_name: faker.person.lastName(),
    groups: Array.from({ length: faker.number.int({ min: 0, max: 3 }) }, () =>
      `/${faker.word.noun()}`),
    ...overrides,
  })
}

export function makeMockUser(overrides: Partial<{
  id: string
  firstName: string
  lastName: string
  email: string
  createdAt: Date
  updatedAt: Date
  lastLogin: Date | null
  adminRoleIds: string[]
  type: 'human' | 'bot' | 'ghost'
}> = {}) {
  return {
    id: faker.string.uuid(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email().toLowerCase(),
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: null,
    adminRoleIds: [],
    type: 'human' as const,
    ...overrides,
  }
}

export function makeMockAdminRole(overrides: Partial<{
  id: string
  name: string
  permissions: bigint
  position: number
  oidcGroup: string
  type: string
}> = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.lorem.words(2),
    permissions: 1n,
    position: 0,
    oidcGroup: '',
    type: 'managed',
    ...overrides,
  }
}

export function makeJwksResponse(kid: string): Response {
  const { publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const jwk = publicKey.export({ format: 'jwk' })
  return new Response(JSON.stringify({
    keys: [
      {
        kid,
        kty: 'RSA',
        use: 'sig',
        n: jwk.n,
        e: jwk.e,
      },
    ],
  }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
    },
  })
}
