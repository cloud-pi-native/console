// This file is symlinked from plugins/opencds/app.js

import { createSSRApp } from 'vue'

const ListServiceChains = await import('./ListServiceChains.vue')

export function createApp() {
  return createSSRApp(ListServiceChains)
}
