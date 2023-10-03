import { describe, it, expect } from 'vitest'
import { noSpace, email, idInUrl } from '@/utils/regex.js'
import { nanoid } from 'nanoid'

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
  it('Should return true (idInUrl)', () => {
    expect(idInUrl.test(('/').concat(nanoid(), ('/')))).toStrictEqual(true)
  })
  it('Should return false (idInUrl)', () => {
    expect(idInUrl.test(('/').concat(nanoid() + 'abc', ('/')))).toStrictEqual(false)
  })
})
