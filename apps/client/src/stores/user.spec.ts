import Keycloak from 'keycloak-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { apiClient } from '../api/xhr-client'
import { useUserStore } from './user'

const authMock = vi.spyOn(apiClient.Users, 'auth')
const listAdminRoles = vi.spyOn(apiClient.AdminRoles, 'listAdminRoles')

authMock.mockResolvedValue(Promise.resolve({ status: 200, body: {} }))
listAdminRoles.mockResolvedValue(Promise.resolve({ status: 200, body: [] }))

vi.mock('keycloak-js', () => {
  const Keycloak = vi.fn()
  Keycloak.prototype.authenticated = true
  Keycloak.prototype.idTokenParsed = {
    email: 'michel.michel@test.com',
    sub: 'userId',
    given_name: 'Michel',
    family_name: 'MICHEL',
    groups: ['/admin'],
  }
  Keycloak.prototype.login = vi.fn()
  Keycloak.prototype.logout = vi.fn()

  return { default: Keycloak }
})
const keycloak = new Keycloak()

describe('user Store', () => {
  beforeEach(() => {
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should retrieve isLoggedIn from Keycloak (true)', async () => {
    const userStore = useUserStore()

    expect(userStore.isLoggedIn).toBeUndefined()

    await userStore.setIsLoggedIn()

    expect(userStore.isLoggedIn).toEqual(true)
  })

  it('should retrieve userProfile from Keycloak', async () => {
    const userStore = useUserStore()

    expect(userStore.userProfile).toMatchObject({})

    userStore.setUserProfile()

    expect(userStore.userProfile).toMatchObject({
      email: 'michel.michel@test.com',
      id: 'userId',
      firstName: 'Michel',
      lastName: 'MICHEL',
    })
  })

  it('should call Keycloak login function', async () => {
    const userStore = useUserStore()

    await userStore.login()

    expect(keycloak.login).toBeCalledTimes(1)
  })

  it('should call Keycloak logout function', async () => {
    const userStore = useUserStore()

    await userStore.logout()

    expect(keycloak.logout).toBeCalledTimes(1)
  })
})
