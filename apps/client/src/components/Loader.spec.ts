import { afterEach, describe, expect, it } from 'vitest'
import { createApp, h } from 'vue'
import Loader from './Loader.vue'

const apps: ReturnType<typeof createApp>[] = []
const containers: HTMLElement[] = []

afterEach(() => {
  apps.forEach(app => app.unmount())
  containers.forEach(container => container.remove())
  apps.length = 0
  containers.length = 0
})

function mountLoader() {
  const container = document.createElement('div')
  document.body.append(container)
  const app = createApp({ render: () => h(Loader) })
  app.mount(container)
  apps.push(app)
  containers.push(container)
  return container
}

describe('loader', () => {
  it('exposes the loading state as a polite status output', () => {
    const container = mountLoader()
    const output = container.querySelector('output')

    expect(output).not.toBeNull()
    expect(output?.getAttribute('aria-live')).toBe('polite')
    expect(output?.getAttribute('aria-busy')).toBe('true')
    expect(output?.textContent).toContain('Chargement')
  })

  it('keeps the spinner decorative', () => {
    const container = mountLoader()
    const icon = container.querySelector('svg')

    expect(icon?.getAttribute('aria-hidden')).toBe('true')
  })
})
