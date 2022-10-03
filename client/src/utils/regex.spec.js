import { noSpace, email } from '@/utils/regex.js'

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
})
