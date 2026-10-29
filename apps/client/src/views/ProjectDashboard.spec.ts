import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import ProjectDashboard from './ProjectDashboard.vue'
import { apiClient } from '../api/xhr-client.js'

const updateProjectMock = vi.spyOn(apiClient.Projects, 'updateProject')
const getProjectMock = vi.spyOn(apiClient.Projects, 'getProject')

const apps: ReturnType<typeof createApp>[] = []
const containers: HTMLElement[] = []

afterEach(() => {
  apps.forEach(app => app.unmount())
  containers.forEach(container => container.remove())
  apps.length = 0
  containers.length = 0
  vi.clearAllMocks()
})

function mountDashboard() {
  const container = document.createElement('div')
  document.body.append(container)
  const app = createApp({
    render: () => h(RouterLinkStub),
  })
  const router = useRouter()
  return { container }
}

describe('ProjectDashboard save failures', () => {
  it('surfaces a rejected save through the snackbar', async () => {
    setActivePinia(createPinia())
    updateProjectMock.mockRejectedValue(new Error('save rejected'))
    getProjectMock.mockResolvedValue({ status: 200, body: {} })
  })
})
