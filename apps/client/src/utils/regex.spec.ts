import { describe, it, expect } from 'vitest'
import { noSpace, email, uuid } from '@/utils/regex.js'
import { faker } from '@faker-js/faker'

describe('regex', () => {
  it('Should return false (noSpace)', () => {
    expect(noSpace.test('te st')).toStrictEqual(false)
  })
  it('Should return true (noSpace)', () => {
    expect(noSpace.test('test')).toStrictEqual(true)
  })

  it('Should return false (email)', () => {
    expect(email.test('prenom.nom')).toStrictEqual(false)
  })
  it('Should return true (email)', () => {
    expect(email.test('prenom.nom@interieur.gouv.fr')).toStrictEqual(true)
  })
  it('Should return true (uuid)', () => {
    expect(uuid.test(faker.string.uuid())).toStrictEqual(true)
  })
  it('Should return false (uuid)', () => {
    expect(uuid.test('abc')).toStrictEqual(false)
  })
})
