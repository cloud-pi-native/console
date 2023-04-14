import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../api/xhr-client.js'
import { useUserStore } from './user.js'
import Keycloak from 'keycloak-js'

vi.spyOn(apiClient, 'get')
vi.spyOn(apiClient, 'post')
vi.spyOn(apiClient, 'put')
vi.spyOn(apiClient, 'patch')
vi.spyOn(apiClient, 'delete')

vi.mock('keycloak-js', () => {
  const Keycloak = vi.fn()
  Keycloak.prototype.authenticated = true
  Keycloak.prototype.idTokenParsed = {
    email: 'michel.michel@test.com',
    sub: 'userId',
    given_name: 'Michel',
    family_name: 'MICHEL',
  }
  Keycloak.prototype.login = vi.fn()
  Keycloak.prototype.logout = vi.fn()

  return { default: Keycloak }
})

describe('Counter Store', () => {
  let keycloak
  beforeEach(() => {
    keycloak = new Keycloak()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('Should retrieve isLoggedIn from Keycloak (true)', () => {
    const userStore = useUserStore()

    expect(userStore.isLoggedIn).toBeUndefined()

    userStore.setIsLoggedIn()

    expect(userStore.isLoggedIn).toEqual(true)
  })

  it('Should retrieve userProfile from Keycloak', async () => {
    const userStore = useUserStore()

    expect(userStore.userProfile).toMatchObject({})

    await userStore.setUserProfile()

    expect(userStore.userProfile).toMatchObject({
      email: 'michel.michel@test.com',
      id: 'userId',
      firstName: 'Michel',
      lastName: 'MICHEL',
    })
  })

  it('Should call Keycloak login function', async () => {
    const userStore = useUserStore()

    await userStore.login()

    expect(keycloak.login).toBeCalledTimes(1)
  })

  it('Should call Keycloak logout function', async () => {
    const userStore = useUserStore()

    await userStore.logout()

    expect(keycloak.logout).toBeCalledTimes(1)
  })
})
