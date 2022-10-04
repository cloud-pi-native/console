import '@gouvminint/vue-dsfr/styles'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import VueDsfr from '@gouvminint/vue-dsfr'
import 'virtual:windi.css'

import App from './App.vue'
import router from './router/index.js'
import * as icons from './icons.js'

import './main.css'
// import { initKeycloak } from './utils/oidc/initSso.js'
// import { useUserStore } from './stores/user-store.js'

const app = createApp(App)
  .use(createPinia())
  .use(router)
  .use(VueDsfr, { icons: Object.values(icons) })

// const userStore = useUserStore()
// initKeycloak().then(async (resp) => {
//   console.log(resp)
//   userStore.setLoggedIn(resp)

//   if (resp) {
//     console.log('test true')
app.mount('#app')
//   }
//   // console.log('test false')
//   app.mount('#app')
//   // await nextTick()
//   // app.$router.push({ name: 'About' })
// })
