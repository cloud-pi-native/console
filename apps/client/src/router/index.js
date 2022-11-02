import { createRouter, createWebHistory } from 'vue-router'
// import { getKeycloak, keycloakLogin, keycloakLogout } from '@/utils/keycloak/init-sso.js'
import { useUserStore } from '@/stores/user.js'

import DsoHome from '@/views/DsoHome.vue'
import CreateProject from '@/views/CreateProject.vue'
import DsoProjects from '@/views/projects/DsoProjects.vue'
import DsoDashboard from '@/views/projects/DsoDashboard.vue'
import DsoServices from '@/views/projects/DsoServices.vue'
import DsoTeam from '@/views/projects/DsoTeam.vue'
import DsoRepos from '@/views/projects/DsoRepos.vue'

const MAIN_TITLE = 'Console Cloud PI Native'

/**
 * @type {import('vue-router').RouteRecord[]}
 */
const routes = [
  {
    path: '/login',
    name: 'Login',
    beforeEnter: async (to, from) => {
      const userStore = useUserStore()
      await userStore.login()
      // await keycloakLogin()
    },
  },
  {
    path: '/logout',
    name: 'Logout',
    beforeEnter: async (to, from) => {
      const userStore = useUserStore()
      await userStore.logout()
      // await keycloakLogout()
    },
  },
  {
    path: '/',
    name: 'Home',
    component: DsoHome,
  },
  {
    path: '/projects',
    name: 'Projects',
    component: DsoProjects,
  },
  {
    path: '/projects/create-project',
    name: 'CreateProject',
    component: CreateProject,
  },
  {
    path: '/projects/:id/dashboard',
    name: 'Dashboard',
    component: DsoDashboard,
  },
  {
    path: '/projects/:id/services',
    name: 'Services',
    component: DsoServices,
  },
  {
    path: '/projects/:id/team',
    name: 'Team',
    component: DsoTeam,
  },
  {
    path: '/projects/:id/repos',
    name: 'Repos',
    component: DsoRepos,
  },
  {
    path: '/doc',
    name: 'Doc',
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

router.beforeEach(async (to, from, next) => {
  const validPath = ['Login', 'Home', 'Doc']

  const userStore = useUserStore()
  userStore.setIsLoggedIn()
  if (validPath.includes(to.name) || userStore.isLoggedIn) {
    return next()
  }

  next('Login')
})

export default router
