import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { apiClient } from '../../api/xhr-client.js'
import { useAdminClusterStore } from './cluster.js'

vi.spyOn(apiClient, 'get')
vi.spyOn(apiClient, 'post')
vi.spyOn(apiClient, 'put')
vi.spyOn(apiClient, 'patch')
vi.spyOn(apiClient, 'delete')

// TODO : unskip
describe.skip('Counter Store', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // creates a fresh pinia and make it active so it's automatically picked
    // up by any useStore() call without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })

  it('Should get clusters list by api call', async () => {
    const data = [
      {
        id: '1e4fdb28-f9ea-46d4-ad16-607c7f1aa8b6',
        label: 'cluster1',
        projectsId: [
          '22e7044f-8414-435d-9c4a-2df42a65034b',
        ],
        user: {
          certData: 'userCAD',
          keyData: 'userCKD',
        },
        cluster: {
          caData: 'clusterCAD',
          server: 'https://coucou.com:5000',
          tlsServerName: 'coucou.com',
        },
        clusterResources: true,
        privacy: 'dedicated',
      },
      {
        id: '1e4fdb28-f9ea-46d4-ad16-607c7f1aa8b7',
        label: 'cluster2',
        projectsId: [
          '22e7044f-8414-435d-9c4a-2df42a65034b',
        ],
        user: {
          certData: 'userCAD',
          keyData: 'userCKD',
        },
        clusterResources: true,
        privacy: 'public',
      },
    ]
    apiClient.get.mockReturnValueOnce(Promise.resolve({ data }))
    const adminClusterStore = useAdminClusterStore()

    const res = await adminClusterStore.getAllClusters()

    expect(res).toBe(data)
    expect(apiClient.get).toHaveBeenCalledTimes(1)
    expect(apiClient.get.mock.calls[0][0]).toBe('/admin/clusters')
  })

  it('Should add cluster by api call', async () => {
    const data = {
      id: '1e4fdb28-f9ea-46d4-ad16-607c7f1aa8b6',
      label: 'cluster1',
      projectsId: [
        '22e7044f-8414-435d-9c4a-2df42a65034b',
      ],
      user: {
        certData: 'userCAD',
        keyData: 'userCKD',
      },
      cluster: {
        caData: 'clusterCAD',
        server: 'https://coucou.com:5000',
        tlsServerName: 'coucou.com',
      },
      clusterResources: true,
      privacy: 'dedicated',
    }
    apiClient.get.mockReturnValueOnce(Promise.resolve({ data }))
    const adminClusterStore = useAdminClusterStore()

    const res = await adminClusterStore.addCluster(data)

    expect(res).toBe(data)
    expect(apiClient.post).toHaveBeenCalledTimes(1)
    expect(apiClient.post.mock.calls[0][0]).toBe('/admin/clusters')
  })

  it('Should update cluster by api call', async () => {
    const data = {
      id: '1e4fdb28-f9ea-46d4-ad16-607c7f1aa8b6',
      projectsId: [
        '22e7044f-8414-435d-9c4a-2df42a65034b',
      ],
      user: {
        certData: 'userCAD',
        keyData: 'userCKD',
      },
      cluster: {
        caData: 'clusterCAD',
        server: 'https://coucou.com:5000',
        tlsServerName: 'coucou.com',
      },
      clusterResources: true,
      privacy: 'dedicated',
    }
    apiClient.get.mockReturnValueOnce(Promise.resolve({ data }))
    const adminClusterStore = useAdminClusterStore()

    const res = await adminClusterStore.updateCluster(data)

    expect(res).toBe(data)
    expect(apiClient.put).toHaveBeenCalledTimes(1)
    expect(apiClient.put.mock.calls[0][0]).toBe('/admin/clusters/1e4fdb28-f9ea-46d4-ad16-607c7f1aa8b6')
  })
})
