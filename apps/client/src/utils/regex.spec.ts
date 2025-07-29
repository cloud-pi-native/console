import { describe, expect, it } from 'vitest'
import { faker } from '@faker-js/faker'
import { email, noSpace, uuid } from '@/utils/regex'

describe('regex', () => {
  it('should return false (noSpace)', () => {
    expect(noSpace.test('te st')).toStrictEqual(false)
  })
  it('should return true (noSpace)', () => {
    expect(noSpace.test('test')).toStrictEqual(true)
  })

  it('should return false (email)', () => {
    expect(email.test('prenom.nom')).toStrictEqual(false)
  })
  it('should return true (email)', () => {
    expect(email.test('prenom.nom@interieur.gouv.fr')).toStrictEqual(true)
  })
  it('should return true (uuid)', () => {
    expect(uuid.test(faker.string.uuid())).toStrictEqual(true)
  })
  it('should return false (uuid)', () => {
    expect(uuid.test('abc')).toStrictEqual(false)
  })
})
