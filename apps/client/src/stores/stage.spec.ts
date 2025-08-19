import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { apiClient } from '../api/xhr-client.js'
import { useStageStore } from './stage.js'
import type { Stage } from '@cpn-console/shared'

const apiClientListStages = vi.spyOn(apiClient.Stages, 'listStages')
const apiClientGet = vi.spyOn(apiClient.Stages, 'getStageEnvironments')
const apiClientPost = vi.spyOn(apiClient.Stages, 'createStage')
const apiClientPut = vi.spyOn(apiClient.Stages, 'updateStage')
const apiClientDelete = vi.spyOn(apiClient.Stages, 'deleteStage')

describe('stage Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('should get stages list by api call', async () => {
    const data = [
      { id: 'id1', name: 'dev' },
      { id: 'id2', name: 'int' },
      { id: 'id3', name: 'prod' },
    ] as Stage[]
    apiClientListStages.mockResolvedValueOnce({ status: 200, body: data, headers: null })
    const stageStore = useStageStore()

    await stageStore.getAllStages()

    expect(stageStore.stages).toEqual(data)
    expect(apiClientListStages).toHaveBeenCalledTimes(1)
  })

  it('should get a stage\'s associated environments by api call', async () => {
    const stageId = 'stageId'
    const data = [
      { name: 'env1' },
      { name: 'env2' },
      { name: 'env3' },
    ] as { name: string, project: string, cluster: string, owner: string }[]
    apiClientGet.mockResolvedValueOnce({ status: 200, body: data, headers: null })
    const stageStore = useStageStore()

    const res = await stageStore.getStageAssociatedEnvironments(stageId)

    expect(res).toBe(data)
    expect(apiClientGet).toHaveBeenCalledTimes(1)
  })

  it('should create a stage by api call', async () => {
    const data = {
      name: 'int',
    } as Stage

    apiClientPost.mockResolvedValueOnce({ status: 201, body: data, headers: null })
    const stageStore = useStageStore()

    const res = await stageStore.addStage(data)

    expect(res).toBe(data)
    expect(apiClientPost).toHaveBeenCalledTimes(1)
  })

  it('should update a stage\'s quotas and clusters associated by api call', async () => {
    const stageId = 'stageId'
    const quotaIds = ['stage1']
    const clusterIds = ['cluster1']
    const data = {
      name: 'stageA',
      quotaIds,
      clusterIds,
      id: stageId,
    }

    apiClientPut.mockResolvedValueOnce({ status: 200, body: data, headers: null })
    const stageStore = useStageStore()

    const res = await stageStore.updateStage(stageId, { clusterIds, name: 'stageA' })

    expect(res).toBe(data)
    expect(apiClientPut).toHaveBeenCalledTimes(1)
  })

  it('should delete a stage by api call', async () => {
    const stageId = 'stageId'

    apiClientDelete.mockResolvedValueOnce({ status: 204, body: null, headers: null })
    const stageStore = useStageStore()

    await stageStore.deleteStage(stageId)

    expect(apiClientDelete).toHaveBeenCalledTimes(1)
  })
})
