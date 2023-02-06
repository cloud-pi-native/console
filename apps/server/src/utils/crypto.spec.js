import { describe, it, expect } from 'vitest'
import { compareToHash, getHash, encrypt, decrypt } from './crypto'

describe('crypto', () => {
  it('Should return true if hashes are equal', async () => {
    const password = 'password'
    const hashedPassword = await getHash(password)
    const areHashesEquals = await compareToHash(password, hashedPassword)

    expect(areHashesEquals).toBe(true)
  })

  it('Should return false if hashes are not equal', async () => {
    const password = 'password'
    const wrongPassword = 'wrong'
    const hashedPassword = await getHash(password)
    const areHashesEquals = await compareToHash(wrongPassword, hashedPassword)

    expect(areHashesEquals).toBe(false)
  })

  it('Should encrypt data', async () => {
    const token = 'tokenToEncrypt'
    const encryptedToken = await encrypt(token)

    expect(encryptedToken).not.toEqual(token)
  })

  it('Should decrypt data', async () => {
    const token = 'tokenToEncrypt'
    const encryptedToken = await encrypt(token)
    const decryptedToken = await decrypt(encryptedToken)

    expect(decryptedToken).toEqual(token)
  })

  it('Should return error when encrypting empty data', async () => {
    let res
    await encrypt().catch(err => { res = err })

    expect(res).toBeInstanceOf(Error)
  })

  it('Should return error when decrypting empty data', async () => {
    const token = 'tokenToEncrypt'
    await encrypt(token)

    let res
    await decrypt().catch(err => { res = err })

    expect(res).toBeInstanceOf(Error)
  })
})
