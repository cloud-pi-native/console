import { createRouter, createWebHistory } from 'vue-router'

import DsoHome from '@/views/DsoHome.vue'
import OrderProject from '@/views/OrderProject.vue'
// import { useUserStore } from '@/stores/user-store.js'
// import { initKeycloak } from '@/utils/oidc/initSso.js'
import DsoProjects from '@/views/DsoProjects.vue'
import DsoDashboard from '@/views/DsoDashboard.vue'
import DsoServices from '@/views/DsoServices.vue'
import DsoTeam from '@/views/DsoTeam.vue'

const MAIN_TITLE = 'Portail Cloud PI Native'

/**
 * @type {import('vue-router').RouteRecord[]}
 */
const routes = [
  {
    path: '/',
    name: 'Home',
    component: DsoHome,
    // TODO: Pas de redirection, à corriger
    // beforeEnter: async (to, from, next) => {
    //   // const userStore = useUserStore()
    //   const resp = await initKeycloak()
    //   // console.log(resp)

    //   // console.log('beforeEnter')
    //   // if (!userStore.loggedIn) {
    //   if (!resp) {
    //     console.log('beforeEnter false')
    //     return next({ name: 'About' })
    //   }
    //   return next()
    // },
  },
  {
    path: '/doc',
    name: 'Doc',
    // component: DsoDoc,
  },
  {
    path: '/order-project',
    name: 'OrderProject',
    component: OrderProject,
  },
  {
    path: '/projects',
    component: DsoProjects,
    children: [
      {
        path: '/dashboard',
        name: 'Dashboard',
        component: DsoDashboard,
      },
      {
        path: '/services',
        name: 'Services',
        component: DsoServices,
      },
      {
        path: '/team',
        name: 'Team',
        component: DsoTeam,
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env?.BASE_URL || ''),
  routes,
})

router.beforeEach((to) => { // Cf. https://github.com/vueuse/head pour des transformations avancées de Head
  const specificTitle = to.meta.title ? `${to.meta.title} - ` : ''
  document.title = `${specificTitle}${MAIN_TITLE}`
})

export default router
