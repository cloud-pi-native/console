import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { ServiceBody } from '@cpn-console/shared'
import { apiClient } from '../api/xhr-client.js'
import { useProjectServiceStore } from './project-services.js'

const apiClientGet = vi.spyOn(apiClient.ProjectServices, 'getServices')
const apiClientUpdate = vi.spyOn(apiClient.ProjectServices, 'updateProjectServices')

describe('Service Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('Should get services by api call (empty array)', async () => {
    const data: ServiceBody = []
    apiClientGet.mockReturnValueOnce(Promise.resolve({ status: 200, body: data }))
    const projectServiceStore = useProjectServiceStore()
    const result = await projectServiceStore.getProjectServices('id')
    expect(result).toHaveLength(0)

    expect(apiClientGet).toHaveBeenCalledTimes(1)
  })

  it('Should update services by api call', async () => {
    const projectServiceStore = useProjectServiceStore()
    apiClientUpdate.mockReturnValueOnce(Promise.resolve({ status: 204, body: null }))
    projectServiceStore.updateProjectServices({ pluginName: { key: 'value' } }, 'id')

    expect(apiClientUpdate).toHaveBeenCalledTimes(1)
  })
})
