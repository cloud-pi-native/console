import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../../api/xhr-client.js'
import { useAdminQuotaStore } from './quota.js'

const apiClientGet = vi.spyOn(apiClient, 'get')
const apiClientPost = vi.spyOn(apiClient, 'post')
const apiClientPut = vi.spyOn(apiClient, 'put')
const apiClientDelete = vi.spyOn(apiClient, 'delete')

describe('Quota Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('Should get quotas list by api call', async () => {
    const data = [
      { id: 'id1', name: 'small' },
      { id: 'id2', name: 'medium' },
      { id: 'id3', name: 'large' },
    ]
    apiClientGet.mockReturnValueOnce(Promise.resolve({ data }))
    const adminQuotaStore = useAdminQuotaStore()

    await adminQuotaStore.getAllQuotas()

    expect(adminQuotaStore.quotas).toEqual(data)
    expect(apiClientGet).toHaveBeenCalledTimes(1)
    expect(apiClientGet.mock.calls[0][0]).toBe('/quotas')
  })

  it('Should get a quota\'s associated environments by api call', async () => {
    const quotaId = 'quotaId'
    const data = [
      { id: 'id1', name: 'env1' },
      { id: 'id2', name: 'env2' },
      { id: 'id3', name: 'env3' },
    ]
    apiClientGet.mockReturnValueOnce(Promise.resolve({ data }))
    const adminQuotaStore = useAdminQuotaStore()

    const res = await adminQuotaStore.getQuotaAssociatedEnvironments(quotaId)

    expect(res).toBe(data)
    expect(apiClientGet).toHaveBeenCalledTimes(1)
    expect(apiClientGet.mock.calls[0][0]).toBe(`/admin/quotas/${quotaId}/environments`)
  })

  it('Should create a quota by api call', async () => {
    const data = {
      name: 'quota1',
      memory: '2Gi',
      cpu: 2,
      stageIds: ['stage1'],
    }

    apiClientPost.mockReturnValueOnce(Promise.resolve({ data }))
    const adminQuotaStore = useAdminQuotaStore()

    const res = await adminQuotaStore.addQuota(data)

    expect(res).toBe(data)
    expect(apiClientPost).toHaveBeenCalledTimes(1)
    expect(apiClientPost.mock.calls[0][0]).toBe('/admin/quotas')
  })

  it('Should update a quota stage association by api call', async () => {
    const quotaId = 'quotaId'
    const stageIds = ['stage1']

    apiClientPut.mockReturnValueOnce(Promise.resolve({ data: 1 }))
    const adminQuotaStore = useAdminQuotaStore()

    const res = await adminQuotaStore.updateQuotaStage(quotaId, stageIds)

    expect(res).toBe(1)
    expect(apiClientPut).toHaveBeenCalledTimes(1)
    expect(apiClientPut.mock.calls[0][0]).toBe('/admin/quotas/quotastages')
  })

  it('Should update a quota privacy by api call', async () => {
    const quotaId = 'quotaId'

    apiClientPut.mockReturnValueOnce(Promise.resolve({ data: 1 }))
    const adminQuotaStore = useAdminQuotaStore()

    const res = await adminQuotaStore.updateQuotaPrivacy(quotaId, true)

    expect(res).toBe(1)
    expect(apiClientPut).toHaveBeenCalledTimes(1)
    expect(apiClientPut.mock.calls[0][0]).toBe(`/admin/quotas/${quotaId}/privacy`)
  })

  it('Should delete a quota by api call', async () => {
    const quotaId = 'quotaId'

    apiClientDelete.mockReturnValueOnce(Promise.resolve({ data: 1 }))
    const adminQuotaStore = useAdminQuotaStore()

    const res = await adminQuotaStore.deleteQuota(quotaId)

    expect(res).toBe(1)
    expect(apiClientDelete).toHaveBeenCalledTimes(1)
    expect(apiClientDelete.mock.calls[0][0]).toBe(`/admin/quotas/${quotaId}`)
  })
})
