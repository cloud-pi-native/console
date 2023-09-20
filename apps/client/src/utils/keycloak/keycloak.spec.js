import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getKeycloak, getUserProfile, keycloakInit, keycloakLogin, keycloakLogout } from './keycloak.js'

const userToken = {
  email: 'test@test.com',
  sub: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
  given_name: 'Jean',
  family_name: 'DUPOND',
}
const userStored = {
  email: 'test@test.com',
  id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
  firstName: 'Jean',
  lastName: 'DUPOND',
}
const keycloak = getKeycloak()

vi.mock('keycloak-js', () => {
  class Keycloak {
    constructor () {
      this.idTokenParsed = userToken
      this.init = vi.fn()
      this.login = vi.fn()
      this.logout = vi.fn()
    }
  }
  return { default: Keycloak }
})

vi.spyOn(keycloak, 'login')
vi.spyOn(keycloak, 'logout')

describe('keycloak-init', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Should return Keycloak instance', () => {
    const keycloak = getKeycloak()

    expect(keycloak).toBeInstanceOf(Object)
  })

  it('Should return keycloak user profile', () => {
    const keycloakUser = getUserProfile()

    expect(keycloakUser).toBeInstanceOf(Object)
    expect(keycloakUser).toMatchObject(userStored)
  })

  it('Should init keycloak', async () => {
    await keycloakInit()

    expect(keycloak.init.mock.calls).toHaveLength(1)
  })

  it('Should return error if keycloak can\'t be initialize', async () => {
    const error = new Error('Failed to init keycloak')
    keycloak.init.mockReturnValueOnce(Promise.reject(error))
    const res = await keycloakInit()

    expect(keycloak.init.mock.calls).toHaveLength(1)
    expect(res).toEqual(error)
  })

  it('Should start login process to keycloak', async () => {
    await keycloakLogin()

    expect(keycloak.login.mock.calls).toHaveLength(1)
  })

  it('Should return error if login process to keycloak failed', async () => {
    const error = new Error('Failed to start login process keycloak')
    keycloak.login.mockReturnValueOnce(Promise.reject(error))
    const res = await keycloakLogin()

    expect(keycloak.login.mock.calls).toHaveLength(1)
    expect(res).toEqual(error)
  })

  it('Should start logout process to keycloak', async () => {
    await keycloakLogout()

    expect(keycloak.logout.mock.calls).toHaveLength(1)
  })

  it('Should return error if logout process to keycloak failed', async () => {
    const error = new Error('Failed to start logout process keycloak')
    keycloak.logout.mockReturnValueOnce(Promise.reject(error))
    const res = await keycloakLogout()

    expect(keycloak.logout.mock.calls).toHaveLength(1)
    expect(res).toEqual(error)
  })
})
