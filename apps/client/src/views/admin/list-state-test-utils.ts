import { toError } from '@/utils/list-state.js'

export const anyError = toError('Échec du chargement')

declare global {
  interface HTMLElement { __vueApp__?: { unmount: () => void } }
}

export async function mountView(component: unknown): Promise<HTMLElement> {
  const { createApp, h } = await import('vue')
  const { createPinia } = await import('pinia')
  const container = document.createElement('div')
  document.body.append(container)
  const app = createApp({ render: () => h(component as never) })
  app.use(createPinia())
  app.config.warnHandler = () => {}
  app.mount(container)
  container.__vueApp__ = app
  return container
}

export function unmountAll(containers: HTMLElement[]) {
  containers.forEach((container) => {
    container.__vueApp__?.unmount()
    container.remove()
  })
  containers.length = 0
}
