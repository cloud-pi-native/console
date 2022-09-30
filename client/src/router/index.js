import { createRouter, createWebHistory } from 'vue-router'

import DsoHome from '@/views/DsoHome.vue'
import OrderProject from '@/views/OrderProject.vue'

const MAIN_TITLE = 'Portail Cloud PI Native'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: DsoHome,
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
    // component: DsoProjects,
    children: [
      {
        path: '/dashboard',
        name: 'Dashboard',
        // component: DsoDashboard,
      },
      {
        path: '/services',
        name: 'Services',
        // component: DsoServices,
      },
      {
        path: '/team',
        name: 'Team',
        // component: DsoTeam,
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
