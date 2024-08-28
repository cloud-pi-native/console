import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@gouvminint/vue-dsfr/styles'
import 'vue3-json-viewer/dist/index.css'

// @ts-ignore 'vue3-json-viewer' missing types
import JsonViewer from 'vue3-json-viewer'
// @ts-ignore '@gouvminint/vue-dsfr' missing types
import { DsfrSelect, DsfrTag } from '@gouvminint/vue-dsfr'
import { keycloakInit } from './utils/keycloak/keycloak'

import App from './App.vue'
import router from './router/index'
import * as icons from './icons'

import 'virtual:uno.css'
import 'virtual:unocss-devtools'
import './main.css'

await keycloakInit()

addIcons(...Object.values(icons))

createApp(App)
  .use(createPinia())
  .use(router)
  .component('VIcon', OhVueIcon)
  .component('DsfrSelect', DsfrSelect)
  .component('DsfrTag', DsfrTag)
  .use(JsonViewer)
  .mount('#app')
