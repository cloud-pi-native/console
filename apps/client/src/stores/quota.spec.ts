import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { apiClient } from '../api/xhr-client.js'
import { useQuotaStore } from './quota.js'

const apiClientListQuotas = vi.spyOn(apiClient.Quotas, 'listQuotas')
const apiClientGet = vi.spyOn(apiClient.Quotas, 'listQuotaEnvironments')
const apiClientPost = vi.spyOn(apiClient.Quotas, 'createQuota')
const apiClientPut = vi.spyOn(apiClient.Quotas, 'updateQuota')
const apiClientDelete = vi.spyOn(apiClient.Quotas, 'deleteQuota')

describe('quota Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('should get quotas list by api call', async () => {
    const data = [
      { id: 'id1', name: 'small' },
      { id: 'id2', name: 'medium' },
      { id: 'id3', name: 'large' },
    ]
    apiClientListQuotas.mockReturnValueOnce(Promise.resolve({ status: 200, body: data }))
    const quotaStore = useQuotaStore()

    await quotaStore.getAllQuotas()

    expect(quotaStore.quotas).toEqual(data)
    expect(apiClientListQuotas).toHaveBeenCalledTimes(1)
  })

  it('should get a quota\'s associated environments by api call', async () => {
    const quotaId = 'quotaId'
    const data = [
      { id: 'id1', name: 'env1' },
      { id: 'id2', name: 'env2' },
      { id: 'id3', name: 'env3' },
    ]
    apiClientGet.mockReturnValueOnce(Promise.resolve({ status: 200, body: data }))
    const quotaStore = useQuotaStore()

    const res = await quotaStore.getQuotaAssociatedEnvironments(quotaId)

    expect(res).toBe(data)
    expect(apiClientGet).toHaveBeenCalledTimes(1)
  })

  it('should create a quota by api call', async () => {
    const data = {
      name: 'quota1',
      memory: '2Gi',
      cpu: 2,
      stageIds: ['stage1'],
    }

    apiClientPost.mockReturnValueOnce(Promise.resolve({ status: 201, body: data }))
    const quotaStore = useQuotaStore()

    const res = await quotaStore.addQuota(data)

    expect(res).toBe(data)
    expect(apiClientPost).toHaveBeenCalledTimes(1)
  })

  it('should update stages associated by api call', async () => {
    const quotaId = 'quotaId'
    const stageIds = ['stage1']

    apiClientPut.mockReturnValueOnce(Promise.resolve({ status: 200, body: { stageIds } }))
    const quotaStore = useQuotaStore()

    const res = await quotaStore.updateQuota(quotaId, stageIds)

    expect(res).toStrictEqual({ stageIds })
    expect(apiClientPut).toHaveBeenCalledTimes(1)
  })

  it('should update a quota privacy by api call', async () => {
    const quotaId = 'quotaId'

    apiClientPut.mockReturnValueOnce(Promise.resolve({ status: 200, body: 1 }))
    const quotaStore = useQuotaStore()

    const res = await quotaStore.updateQuota(quotaId, { isPrivate: true })

    expect(res).toBe(1)
    expect(apiClientPut).toHaveBeenCalledTimes(1)
  })

  it('should delete a quota by api call', async () => {
    const quotaId = 'quotaId'

    apiClientDelete.mockReturnValueOnce(Promise.resolve({ status: 204 }))
    const quotaStore = useQuotaStore()

    await quotaStore.deleteQuota(quotaId)

    expect(apiClientDelete).toHaveBeenCalledTimes(1)
  })
})
