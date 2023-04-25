import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@gouvminint/vue-dsfr/styles'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { keycloakInit } from './utils/keycloak/keycloak.js'

import VueDsfr from '@gouvminint/vue-dsfr'

import App from './App.vue'
import router from './router/index.js'
import * as icons from './icons.js'

import 'virtual:uno.css'
import 'uno.css'
import 'virtual:unocss-devtools'
import './main.css'

(async () => {
  try {
    await keycloakInit()
  } catch (e) {
    console.log(e)
  }

  createApp(App)
    .use(createPinia())
    .use(router)
    .use(VueDsfr, { icons: Object.values(icons) })
    .mount('#app')
})()
