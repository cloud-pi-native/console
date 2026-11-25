import type { ExperimentalFeatureTarget } from '@cpn-console/shared'
import { ADMIN_PERMS } from '@cpn-console/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, nextTick } from 'vue'
import { listExperimentalFeatureTargets, requestExperimentalFeatureActivation } from '@/api/experimental-feature.js'
import ExperimentalFeatures from './ExperimentalFeatures.vue'

const user = vi.hoisted(() => ({ adminPerms: 0n }))
vi.mock('@/stores/user.js', () => ({ useUserStore: () => user }))
vi.mock('@/api/experimental-feature.js')

const targetId = '11111111-1111-4111-8111-111111111111'
function makeTarget(): ExperimentalFeatureTarget {
  return { id: targetId, key: 'opencds', scope: { kind: 'instance', id: 'console' }, requested: false, revision: 0, application: 'not-observed', events: [] }
}

let app: ReturnType<typeof createApp> | undefined
let container: HTMLDivElement
async function mountPage() {
  container = document.createElement('div')
  document.body.append(container)
  app = createApp(ExperimentalFeatures)
  app.mount(container)
  await new Promise(resolve => setTimeout(resolve, 0))
  await nextTick()
}

function getButton(testId: string): HTMLButtonElement {
  const button = container.querySelector(`[data-testid="${testId}"]`)
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Bouton ${testId} introuvable`)
  return button
}

beforeEach(() => {
  vi.resetAllMocks()
  user.adminPerms = ADMIN_PERMS.MANAGE_SYSTEM
  vi.mocked(listExperimentalFeatureTargets).mockResolvedValue([makeTarget()])
})
afterEach(() => {
  app?.unmount()
  container?.remove()
})

describe('experimental features administration', () => {
  it('distinguishes an activation request from its actual application', async () => {
    vi.mocked(listExperimentalFeatureTargets).mockResolvedValue([{ ...makeTarget(), requested: true }])
    await mountPage()
    expect(container.textContent).toContain('Activation demandée')
    expect(container.textContent).toContain('Application réelle : non observée')
  })

  it('displays a refused activation instead of hiding the failure', async () => {
    vi.mocked(requestExperimentalFeatureActivation).mockRejectedValue(new Error('La révision a changé'))
    await mountPage()
    getButton(`activate-${targetId}`).click()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('La révision a changé')
    expect(container.textContent).not.toContain('Activation demandée')
  })

  it('prevents two concurrent activation requests from the page', async () => {
    let finish: (() => void) | undefined
    vi.mocked(requestExperimentalFeatureActivation).mockImplementation(() => new Promise((resolve) => {
      finish = () => resolve({ ...makeTarget(), requested: true, revision: 1 })
    }))
    await mountPage()
    const button = getButton(`activate-${targetId}`)
    button.click()
    button.click()
    await nextTick()
    expect(requestExperimentalFeatureActivation).toHaveBeenCalledOnce()
    expect(button.disabled).toBe(true)
    finish?.()
    await new Promise(resolve => setTimeout(resolve, 0))
  })

  it('does not show management actions to a read-only administrator', async () => {
    user.adminPerms = ADMIN_PERMS.LIST_SYSTEM
    await mountPage()
    expect(container.querySelector('[data-testid="authorize-target"]')).toBeNull()
    expect(container.querySelector(`[data-testid="activate-${targetId}"]`)).toBeNull()
  })

  it('displays a loading failure and offers a retry', async () => {
    vi.mocked(listExperimentalFeatureTargets).mockRejectedValue(new Error('Console indisponible'))
    await mountPage()
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Console indisponible')
    expect(getButton('reload-targets').disabled).toBe(false)
  })
})
