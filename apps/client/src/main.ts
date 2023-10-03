import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@gouvminint/vue-dsfr/styles'
import 'vue3-json-viewer/dist/index.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { keycloakInit } from './utils/keycloak/keycloak'

import VueDsfr from '@gouvminint/vue-dsfr'

import App from './App.vue'
import router from './router/index'
import * as icons from './icons'
import JsonViewer from 'vue3-json-viewer'

import 'virtual:uno.css'
import 'uno.css'
import 'virtual:unocss-devtools'
import './main.css'

try {
  await keycloakInit()
} catch (error) {
  if (error instanceof Error) throw new Error(error.message)
  throw new Error('échec d\'initialisation du keycloak')
}

createApp(App)
  .use(createPinia())
  .use(router)
  .use(VueDsfr, { icons: Object.values(icons) })
  .use(JsonViewer)
  .mount('#app')
