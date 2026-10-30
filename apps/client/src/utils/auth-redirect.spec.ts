import { beforeEach, describe, expect, it } from 'vitest'
import { consumePostLoginTarget, rememberPostLoginTarget } from './auth-redirect.js'

describe('post-login redirect', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('restores the deep link the user originally requested', () => {
    rememberPostLoginTarget('/projects/mon-projet?tab=logs')

    expect(consumePostLoginTarget()).toBe('/projects/mon-projet?tab=logs')
  })

  it('consumes the target only once', () => {
    rememberPostLoginTarget('/admin/clusters')

    expect(consumePostLoginTarget()).toBe('/admin/clusters')
    expect(consumePostLoginTarget()).toBeUndefined()
  })

  it('ignores the login and logout routes to avoid a redirect loop', () => {
    rememberPostLoginTarget('/login')
    rememberPostLoginTarget('/logout?redirect=/')

    expect(consumePostLoginTarget()).toBeUndefined()
  })

  it('ignores absolute external URLs', () => {
    rememberPostLoginTarget('https://example.gouv.fr/phishing')

    expect(consumePostLoginTarget()).toBeUndefined()
  })
})
