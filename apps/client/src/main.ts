import { addCollection } from '@iconify/vue'
import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@gouvminint/vue-dsfr/styles'
import 'vue3-json-viewer/dist/index.css'
import collections from './icon-collections.js'

// @ts-ignore 'vue3-json-viewer' missing types
import JsonViewer from 'vue3-json-viewer'
// @ts-ignore '@gouvminint/vue-dsfr' missing types
import { DsfrSelect, DsfrTag, VIcon } from '@gouvminint/vue-dsfr'
import { keycloakInit } from './utils/keycloak/keycloak.js'

import App from './App.vue'
import router from './router/index.js'

import 'virtual:uno.css'
import 'virtual:unocss-devtools'
import './main.css'

await keycloakInit()

createApp(App)
  .use(createPinia())
  .use(router)
  .component('DsfrSelect', DsfrSelect)
  .component('DsfrTag', DsfrTag)
  .component('VIcon', VIcon)
  .use(JsonViewer)
  .mount('#app')

for (const collection of collections) {
  addCollection(collection)
}
