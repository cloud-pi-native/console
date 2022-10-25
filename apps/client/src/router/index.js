import { createRouter, createWebHistory } from 'vue-router'

// import { getKeycloak, initKeycloak } from '@/utils/keycloak/init-sso.js'

import DsoHome from '@/views/DsoHome.vue'
import OrderProject from '@/views/OrderProject.vue'
import DsoAuth from '@/views/DsoAuth.vue'
import DsoProjects from '@/views/projects/DsoProjects.vue'
import DsoDashboard from '@/views/projects/DsoDashboard.vue'
import DsoServices from '@/views/projects/DsoServices.vue'
import DsoTeam from '@/views/projects/DsoTeam.vue'
import { useUserStore } from '@/stores/user.js'

const MAIN_TITLE = 'Portail Cloud PI Native'

/**
 * @type {import('vue-router').RouteRecord[]}
 */
const routes = [
  {
    path: '/auth',
    name: 'Auth',
    component: DsoAuth,
    beforeEnter: async (to, from) => {
      const userStore = useUserStore()
      userStore.login()
    },
  },
  {
    path: '/',
    name: 'Home',
    component: DsoHome,
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
router.beforeEach(checkToken)

export default router

async function checkToken (to, from, next) {
  const noTokenRequiredRoutes = [
    'Auth',
    'Home',
    'Doc',
  ]
  if (noTokenRequiredRoutes.includes(to.name)) {
    return next()
  }
  const userStore = useUserStore()
  console.log('test: ', await userStore?.loggedIn?.value)
  if (!userStore?.loggedIn?.value) {
    console.log('not loggedin')
    const token = window.localStorage.getItem('token')
    if (!token) {
      console.log('no token')
      return next({ name: 'Auth' })
    }
    // await store.dispatch('checkToken', token)
    if (!userStore?.loggedIn?.value) {
      console.log('no loggedin')
      return next({ name: 'Auth' })
    }
  }
  console.log('next')
  next()
}
