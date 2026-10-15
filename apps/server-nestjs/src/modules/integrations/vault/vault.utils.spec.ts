import { describe, expect, it } from 'vitest'
import { VaultError } from './vault-http-client.service'
import { generateAppRoleSecretIdPath, generateSecretGroupPath, isVaultBadRequest, isVaultNotFound } from './vault.utils'

describe('vault path helpers', () => {
  it('scopes a group to the project path', () => {
    expect(generateSecretGroupPath('forge', 'my-project', 'GITLAB')).toBe('forge/my-project/GITLAB')
  })

  it('scopes the AppRole secret-id to the project path', () => {
    expect(generateAppRoleSecretIdPath('forge', 'my-project')).toBe('forge/my-project/APPROLE_SECRET_ID')
  })
})

describe('vault error guards', () => {
  it('isVaultNotFound matches a NotFound VaultError', () => {
    expect(isVaultNotFound(new VaultError('NotFound', 'missing'))).toBe(true)
    expect(isVaultNotFound(new VaultError('HttpError', 'conflict', { status: 409 }))).toBe(false)
    expect(isVaultNotFound(new Error('boom'))).toBe(false)
  })

  it('isVaultBadRequest matches a 400 HttpError VaultError', () => {
    expect(isVaultBadRequest(new VaultError('HttpError', 'bad request', { status: 400 }))).toBe(true)
    expect(isVaultBadRequest(new VaultError('HttpError', 'conflict', { status: 409 }))).toBe(false)
    expect(isVaultBadRequest(new VaultError('NotFound', 'missing'))).toBe(false)
  })
})
