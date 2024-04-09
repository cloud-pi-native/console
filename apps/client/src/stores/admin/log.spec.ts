import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../api/xhr-client.js'
import { useAdminLogStore } from './log.js'

const apiClientGet = vi.spyOn(apiClient.LogsAdmin, 'getLogs')

describe('Log Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('Should get logs list and total by api call', async () => {
    const data = {
      total: 1,
      logs: [
        { id: 'thisIsAnId', data: {}, action: 'Create Project', userId: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565' },
      ],
    }
    apiClientGet.mockReturnValueOnce(Promise.resolve({ status: 200, body: data }))
    const adminLogStore = useAdminLogStore()

    await adminLogStore.getAllLogs({ offset: 5, limit: 10 })

    expect(adminLogStore.count).toEqual(data.total)
    expect(adminLogStore.logs).toStrictEqual(data.logs)
    expect(apiClientGet).toHaveBeenCalledTimes(1)
  })
})
