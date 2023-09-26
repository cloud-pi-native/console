import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../api/xhr-client.js'
import { useCIFilesStore } from './ci-files.js'

const apiClientPost = vi.spyOn(apiClient, 'post')

describe('Counter Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('Should get ci files by api call', async () => {
    apiClientPost.mockReturnValueOnce(Promise.resolve({ data: {} }))
    const ciFilesStore = useCIFilesStore()

    await ciFilesStore.generateCIFiles({})

    expect(apiClientPost).toHaveBeenCalledTimes(1)
    expect(apiClientPost.mock.calls[0][0]).toBe('/ci-files')
  })
})
