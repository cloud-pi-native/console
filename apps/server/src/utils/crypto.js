import crypto from 'node:crypto'
import { encryptionKey } from './env.js'

// encryptionKey should have length of 32 characters
// for AES use 16 as ivLength
const ivLength = 16

export const getHash = async (password) => {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(8).toString('hex')
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err)
      resolve(salt + ':' + derivedKey.toString('hex'))
    })
  })
}

export const compareToHash = async (password, hash) => {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(':')
    const keyBuffer = Buffer.from(key, 'hex')
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err)
      resolve(crypto.timingSafeEqual(keyBuffer, derivedKey))
    })
  })
}

export const encrypt = (text) => {
  return new Promise((resolve, reject) => {
    try {
      const iv = crypto.randomBytes(ivLength)
      const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv)
      let encrypted = cipher.update(text)
      encrypted = Buffer.concat([encrypted, cipher.final()])
      resolve(iv.toString('hex') + ':' + encrypted.toString('hex'))
    } catch (err) {
      reject(err)
    }
  })
}

export const decrypt = (text) => {
  return new Promise((resolve, reject) => {
    try {
      const textParts = text.split(':')
      const iv = Buffer.from(textParts.shift(), 'hex')
      const encryptedText = Buffer.from(textParts.join(':'), 'hex')
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv)
      let decrypted = decipher.update(encryptedText)
      decrypted = Buffer.concat([decrypted, decipher.final()])
      resolve(decrypted.toString())
    } catch (err) {
      reject(err)
    }
  })
}

export const generateRandomPassword = (length = 24) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@-_#$*'
  return Array.from(crypto.getRandomValues(new Uint32Array(length)))
    .map((x) => chars[x % chars.length])
    .join('')
}
