import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../api/xhr-client.js'
import { useCIFilesStore } from './ci-files.js'

const apiClientPut = vi.spyOn(apiClient, 'put')

describe('Counter Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('Should get ci files by api call', async () => {
    apiClientPut.mockReturnValueOnce(Promise.resolve({ data: {} }))
    const ciFilesStore = useCIFilesStore()

    await ciFilesStore.generateCIFiles({})

    expect(apiClientPut).toHaveBeenCalledTimes(1)
    expect(apiClientPut.mock.calls[0][0]).toBe('/ci-files')
  })
})
