import Keycloak from 'keycloak-js'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from './user.js'

vi.mock('../api/xhr-client.js', () => ({ apiClient: { Users: { auth: async () => vi.fn } } }))

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

describe('User Store', () => {
  beforeEach(() => {
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('Should retrieve isLoggedIn from Keycloak (true)', async () => {
    const userStore = useUserStore()

    expect(userStore.isLoggedIn).toBeUndefined()

    userStore.setIsLoggedIn()

    expect(userStore.isLoggedIn).toEqual(true)
  })

  it('Should retrieve isAdmin from Keycloak (true)', async () => {
    const userStore = useUserStore()

    expect(userStore.isLoggedIn).toBeUndefined()
    expect(userStore.isAdmin).toBeUndefined()
    expect(userStore.userProfile).toMatchObject({})

    userStore.setIsLoggedIn()

    expect(userStore.isLoggedIn).toEqual(true)
    expect(userStore.isAdmin).toEqual(true)
  })

  it('Should retrieve userProfile from Keycloak', async () => {
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
