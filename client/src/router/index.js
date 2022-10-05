import { createRouter, createWebHistory } from 'vue-router'

import { getKeycloak } from '@/utils/keycloak/init-sso.js'
// import { requestToken } from '@/api/api.js'

import DsoHome from '@/views/DsoHome.vue'
import OrderProject from '@/views/OrderProject.vue'
import AuthComponent from '@/views/AuthComponent.vue'
import DsoProjects from '@/views/projects/DsoProjects.vue'
import DsoDashboard from '@/views/projects/DsoDashboard.vue'
import DsoServices from '@/views/projects/DsoServices.vue'
import DsoTeam from '@/views/projects/DsoTeam.vue'

const MAIN_TITLE = 'Portail Cloud PI Native'

/**
 * @type {import('vue-router').RouteRecord[]}
 */
const routes = [
  {
    path: '/auth',
    name: 'Auth',
    component: AuthComponent,
  },
  {
    path: '/',
    name: 'Home',
    component: DsoHome,
    beforeEnter: (to, from) => {
      const kc = getKeycloak()
      console.log({ 2: kc })
      // requestToken(kc.token)
      // console.log(kc.token)
      // window.localStorage.setItem(kc.token)
    },
  },
  {
    path: '/doc',
    name: 'Doc',
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
