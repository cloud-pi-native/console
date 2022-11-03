import '@gouvminint/vue-dsfr/styles'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import VueDsfr from '@gouvminint/vue-dsfr'
import 'virtual:windi.css'
import App from './App.vue'
import router from './router/index.js'
import * as icons from './icons.js'
import './main.css'
import { keycloakInit } from './utils/keycloak/init.js'

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
