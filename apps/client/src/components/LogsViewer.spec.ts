import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick } from 'vue'

vi.mock('@/router/index.js', () => ({
  default: { push: vi.fn(), replace: vi.fn(), currentRoute: { value: { query: {} } } },
}))

import LogsViewer from './LogsViewer.vue'

const apps: ReturnType<typeof createApp>[] = []
const containers: HTMLElement[] = []

afterEach(() => {
  apps.forEach(app => app.unmount())
  containers.forEach(container => container.remove())
  apps.length = 0
  containers.length = 0
})

function mountLogsViewer(props: Record<string, unknown> = {}) {
  const container = document.createElement('div')
  document.body.append(container)
  const app = createApp({
    render: () => h(LogsViewer, {
      totalLength: 1,
      isUpdating: false,
      page: 0,
      logs: [],
      ...props,
    }),
  })
  app.mount(container)
  apps.push(app)
  containers.push(container)
  return container
}

function findLogsViewerInstance(vnode: any): any {
  if (!vnode) return null
  if (vnode.component?.type === LogsViewer) return vnode.component
  return findLogsViewerInstance(vnode.component?.subTree) ?? findLogsViewerInstance(vnode.children)
}

function instance(container: HTMLElement) {
  return findLogsViewerInstance((container as any)._vnode)
}

async function toggle(container: HTMLElement, title: string) {
  const button = [...container.querySelectorAll('button')].find(b => b.title === title)
  expect(button, `button titled "${title}"`).toBeTruthy()
  button!.click()
  await nextTick()
}

describe('LogsViewer hide toggles', () => {
  // ponytail: DsfrButton swallows DOM clicks in jsdom, so toggles are asserted
  // through the instance state the template binds to, not the rendered DOM
  it('toggles local hide state when the parent binds nothing (uncontrolled)', async () => {
    const container = mountLogsViewer()
    const inst = instance(container)
    expect(inst.setupState.hideLogs).toBe(false)
    await toggle(container, 'Masquer les logs')
    expect(inst.setupState.hideLogs).toBe(true)
  })

  it('toggles local hide-details state when the parent binds nothing', async () => {
    const container = mountLogsViewer()
    const inst = instance(container)
    expect(inst.setupState.hideLogDetails).toBe(false)
    await toggle(container, 'Masquer les clés non essentielles des logs')
    expect(inst.setupState.hideLogDetails).toBe(true)
  })

  it('honours mode=hide as the uncontrolled seed', () => {
    const container = mountLogsViewer({ mode: 'hide' })
    const inst = instance(container)
    expect(inst.setupState.hideLogs).toBe(true)
    // mode=hide renders no toggles — the view starts masked
    expect([...container.querySelectorAll('button')].some(b => b.title === 'Masquer les logs')).toBe(false)
  })
})
