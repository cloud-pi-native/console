import type { Ref } from 'vue'
import { ref } from 'vue'

const DEFAULT_TITLE = 'Console Cloud π Native'

/**
 * Single polite live region for the whole application.
 *
 * It lives at module scope because the router (outside any component) must be
 * able to announce a page change, while `App.vue` renders the region.
 */
const announcement = ref('')

export function routeAnnouncement(to: { meta: { title?: string }, name?: unknown }): string {
  const title = to.meta.title?.trim()
  return `Page : ${title || DEFAULT_TITLE}`
}

export function announce(message: string): void {
  const next = message.trim()
  if (next) announcement.value = next
}

export function useAnnouncer(): { announcement: Ref<string>, announce: typeof announce } {
  return { announcement, announce }
}
