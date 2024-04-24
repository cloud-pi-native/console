import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@gouvminint/vue-dsfr/styles'
import 'vue3-json-viewer/dist/index.css'

import { keycloakInit } from './utils/keycloak/keycloak'

import App from './App.vue'
import router from './router/index'
import * as icons from './icons'
// @ts-ignore
import JsonViewer from 'vue3-json-viewer'

import 'virtual:uno.css'
import 'virtual:unocss-devtools'
import './main.css'
import { DsfrSelect } from '@gouvminint/vue-dsfr'

try {
  await keycloakInit()
} catch (error) {
  if (error instanceof Error) throw new Error(error.message)
  throw new Error('échec d\'initialisation du keycloak')
}

addIcons(...Object.values(icons))

createApp(App)
  .use(createPinia())
  .use(router)
  .component('VIcon', OhVueIcon)
  .component('DsfrSelect', DsfrSelect)
  .use(JsonViewer)
  .mount('#app')
