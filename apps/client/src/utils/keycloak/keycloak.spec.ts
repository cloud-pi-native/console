import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getKeycloak, getUserProfile, keycloakInit, keycloakLogin, keycloakLogout } from './keycloak'

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
    idTokenParsed: Record<string, string>
    init: () => void
    login: () => void
    logout: () => void

    constructor() {
      this.idTokenParsed = userToken
      this.init = vi.fn()
      this.login = vi.fn()
      this.logout = vi.fn()
    }
  }
  return { default: Keycloak }
})

const mockedKeycloakInit = vi.spyOn(keycloak, 'init')
const mockedKeycloakLogin = vi.spyOn(keycloak, 'login')
const mockedKeycloakLogout = vi.spyOn(keycloak, 'logout')

describe('keycloak-init', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return Keycloak instance', () => {
    const keycloak = getKeycloak()

    expect(keycloak).toBeInstanceOf(Object)
  })

  it('should return keycloak user profile', () => {
    const keycloakUser = getUserProfile()

    expect(keycloakUser).toBeInstanceOf(Object)
    expect(keycloakUser).toMatchObject(userStored)
  })

  it('should init keycloak', async () => {
    await keycloakInit()

    expect(mockedKeycloakInit.mock.calls).toHaveLength(1)
  })

  it('should throw an error if keycloak can\'t be initialize', async () => {
    const error = new Error('Failed to init keycloak')
    try {
      mockedKeycloakInit.mockReturnValueOnce(Promise.reject(error))
      await keycloakInit()
    } catch (e) {
      expect(mockedKeycloakInit.mock.calls).toHaveLength(1)
      expect(e).toEqual(error)
    }
  })

  it('should start login process to keycloak', async () => {
    await keycloakLogin()

    expect(mockedKeycloakLogin.mock.calls).toHaveLength(1)
  })

  it('should throw an error if login process to keycloak failed', async () => {
    const error = new Error('Failed to start login process keycloak')
    try {
      mockedKeycloakLogin.mockReturnValueOnce(Promise.reject(error))
      await keycloakLogin()
    } catch (e) {
      expect(mockedKeycloakLogin.mock.calls).toHaveLength(1)
      expect(e).toEqual(error)
    }
  })

  it('should start logout process to keycloak', async () => {
    await keycloakLogout()

    expect(mockedKeycloakLogout.mock.calls).toHaveLength(1)
  })

  it('should throw an error if logout process to keycloak failed', async () => {
    const error = new Error('Failed to start logout process keycloak')
    try {
      mockedKeycloakLogout.mockReturnValueOnce(Promise.reject(error))
      await keycloakLogout()
    } catch (e) {
      expect(mockedKeycloakLogout.mock.calls).toHaveLength(1)
      expect(e).toEqual(error)
    }
  })
})
