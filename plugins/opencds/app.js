// This file is symlinked from plugins/opencds/app.js

import { createSSRApp } from 'vue'

export function createApp() {
  return createSSRApp({
    data: () => ({ count: 1 }),
    template: `<div @click="count++">{{ count }}</div>`,
  })
}
