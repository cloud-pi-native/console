import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getKeycloak } from '@/utils/keycloak/keycloak.js'
import { apiClient } from './xhr-client.js'

const keycloak = getKeycloak()

vi.mock('keycloak-js', () => {
  class Keycloak {
    authenticated: boolean
    token: string | undefined
    updateToken: () => Promise<boolean>
    login: () => void

    constructor() {
      this.authenticated = false
      this.token = undefined
      this.updateToken = vi.fn().mockResolvedValue(true)
      this.login = vi.fn()
    }
  }
  return { default: Keycloak }
})

function mockFetch(responses: Array<{ status: number }>) {
  let call = 0
  const mocked = vi.fn(() => {
    const response = responses[Math.min(call, responses.length - 1)]
    call += 1
    return Promise.resolve(new Response(null, { status: response.status }))
  })
  vi.stubGlobal('fetch', mocked)
  return mocked
}

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  keycloak.authenticated = true
  keycloak.token = 'token-1'
})

describe('xhr-client', () => {
  it('should refresh the keycloak token before an authenticated request', async () => {
    const mockedFetch = mockFetch([{ status: 200 }])

    await apiClient.System.getHealth()

    expect(keycloak.updateToken).toHaveBeenCalledWith(30)
    expect(keycloak.updateToken.mock.calls).toHaveLength(1)
    expect(mockedFetch.mock.calls).toHaveLength(1)
  })

  it('should not refresh the token for bypass paths', async () => {
    mockFetch([{ status: 200 }, { status: 200 }, { status: 200 }])

    await fetch('/api/v1/version')
    await fetch('/login')
    await fetch('/api/v1/services')

    expect(keycloak.updateToken.mock.calls).toHaveLength(0)
  })

  it('should retry exactly once after a 401-triggered refresh', async () => {
    const mockedFetch = mockFetch([{ status: 401 }, { status: 200 }])

    await apiClient.System.getHealth()

    expect(keycloak.updateToken).toHaveBeenCalledWith(-1)
    expect(keycloak.updateToken).toHaveBeenCalledWith(30)
    expect(mockedFetch.mock.calls).toHaveLength(2)
  })

  it('should never retry twice nor loop on repeated 401', async () => {
    const mockedFetch = mockFetch([{ status: 401 }])

    const response = await apiClient.System.getHealth()

    expect(response.status).toBe(401)
    expect(mockedFetch.mock.calls).toHaveLength(2)
    expect(keycloak.updateToken.mock.calls).toHaveLength(2)
  })

  it('should still send the request when updateToken fails before sending', async () => {
    const mockedFetch = mockFetch([{ status: 200 }])
    keycloak.updateToken = vi.fn().mockRejectedValue(new Error('refresh failed'))

    const response = await apiClient.System.getHealth()

    expect(response.status).toBe(200)
    expect(mockedFetch.mock.calls).toHaveLength(1)
    expect(keycloak.login).not.toHaveBeenCalled()
  })

  it('should surface the 401 without redirect when the retry refresh fails', async () => {
    const mockedFetch = mockFetch([{ status: 401 }])
    let call = 0
    keycloak.updateToken = vi.fn(() => {
      call += 1
      if (call === 1) return Promise.resolve(true)
      return Promise.reject(new Error('refresh failed'))
    })

    const response = await apiClient.System.getHealth()

    expect(response.status).toBe(401)
    expect(mockedFetch.mock.calls).toHaveLength(2)
    expect(keycloak.login).not.toHaveBeenCalled()
  })

  it('should not retry when the session is no longer authenticated on 401', async () => {
    const mockedFetch = mockFetch([{ status: 401 }])
    keycloak.authenticated = false

    await apiClient.System.getHealth()

    expect(mockedFetch.mock.calls).toHaveLength(1)
    expect(keycloak.updateToken.mock.calls).toHaveLength(1)
    expect(keycloak.login).not.toHaveBeenCalled()
  })
})
