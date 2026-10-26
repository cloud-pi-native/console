import type { Mock } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api/xhr-client.js'
import { anyError, mountView, unmountAll } from './list-state-test-utils.js'
import ListPlugins from './ListPlugins.vue'
import ListProjects from './ListProjects.vue'
import ListServiceChains from './ListServiceChains.vue'
import ListStages from './ListStages.vue'
import ListZones from './ListZones.vue'

interface FakeApi {
  hang: () => void
  fail: (error: Error) => void
  ok: () => void
  calls: () => number
}

function fakeFor(spy: Mock): FakeApi {
  return {
    hang: () => spy.mockReturnValue(new Promise(() => {})),
    fail: (error: Error) => spy.mockRejectedValue(error),
    ok: () => spy.mockResolvedValue({ status: 200, body: [], headers: {} }),
    calls: () => spy.mock.calls.length,
  }
}

const containers: HTMLElement[] = []

async function mountTracked(component: unknown): Promise<HTMLElement> {
  const container = await mountView(component)
  containers.push(container)
  return container
}

beforeEach(() => {
  vi.resetAllMocks()
  setActivePinia(createPinia())
})

afterEach(() => {
  unmountAll(containers)
})

const loader = 'cpin-loader'
const retry = 'listRetry'

const views = [
  {
    name: 'ListZones',
    component: ListZones,
    api: fakeFor(vi.spyOn(apiClient.Zones, 'listZones')),
    // ListZones also loads clusters during its initial load
    extra: [fakeFor(vi.spyOn(apiClient.Clusters, 'listClusters'))],
    emptyText: 'Aucune zone enregistrée',
    emptyTestId: 'zonesEmptyState',
  },
  {
    name: 'ListStages',
    component: ListStages,
    api: fakeFor(vi.spyOn(apiClient.Stages, 'listStages')),
    // ListStages also loads clusters during its initial load
    extra: [fakeFor(vi.spyOn(apiClient.Clusters, 'listClusters'))],
    emptyText: 'Aucun type d\'environnement enregistré',
    emptyTestId: 'stagesEmptyState',
  },
  {
    name: 'ListPlugins',
    component: ListPlugins,
    api: fakeFor(vi.spyOn(apiClient.SystemPlugin, 'getPluginsConfig')),
    extra: [],
    emptyText: 'Aucun service disponible',
    emptyTestId: 'servicesEmptyState',
  },
  {
    name: 'ListProjects',
    component: ListProjects,
    api: fakeFor(vi.spyOn(apiClient.Projects, 'listProjects')),
    extra: [],
    emptyText: 'Aucun projet trouvé',
    emptyTestId: 'projectsEmptyState',
  },
  {
    name: 'ListServiceChains',
    component: ListServiceChains,
    api: fakeFor(vi.spyOn(apiClient.ServiceChains, 'listServiceChains')),
    extra: [],
    emptyText: 'Aucune chaîne de service trouvée',
    emptyTestId: 'serviceChainsEmptyState',
  },
]

describe.each(views)('$name collection states', ({ name, component, api, extra, emptyText, emptyTestId }) => {
  it(`renders a loader before the first ${name} response resolves`, async () => {
    api.hang()
    extra.forEach(side => side.hang())
    await mountTracked(component)
    expect(document.querySelector(`[data-testid="${loader}"]`)).toBeTruthy()
    expect(document.body.textContent).not.toContain(emptyText)
  })

  it(`renders an error alert with retry after ${name} fails`, async () => {
    api.fail(anyError)
    extra.forEach(side => side.ok())
    await mountTracked(component)
    await vi.waitFor(() => {
      expect(document.querySelector('[data-testid$="LoadError"]')).toBeTruthy()
      expect(document.querySelector(`[data-testid="${retry}"]`)).toBeTruthy()
    }, { timeout: 500 })
    expect(document.body.textContent).not.toContain(emptyText)
  })

  it(`renders the empty state only after a successful, empty ${name} response`, async () => {
    api.ok()
    extra.forEach(side => side.ok())
    await mountTracked(component)
    await vi.waitFor(() => {
      expect(document.querySelector(`[data-testid="${emptyTestId}"]`)).toBeTruthy()
      expect(document.querySelector(`[data-testid="${loader}"]`)).toBeFalsy()
      expect(document.querySelector('[data-testid$="LoadError"]')).toBeFalsy()
    }, { timeout: 500 })
    expect(document.body.textContent).toContain(emptyText)
  })
})

describe('retry actions re-run the initial load', () => {
  it('retries the zones load when the retry button is clicked', async () => {
    const zonesApi = fakeFor(vi.spyOn(apiClient.Zones, 'listZones'))
    zonesApi.fail(anyError)
    await mountTracked(views[0]!.component)
    await vi.waitFor(() => {
      expect(document.querySelector(`[data-testid="${retry}"]`)).toBeTruthy()
    }, { timeout: 500 })
    const before = zonesApi.calls()
    document.querySelector<HTMLButtonElement>(`[data-testid="${retry}"]`)!.click()
    await vi.waitFor(() => {
      expect(zonesApi.calls()).toBeGreaterThan(before)
    }, { timeout: 500 })
  })
})
