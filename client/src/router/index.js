import { createRouter, createWebHistory } from 'vue-router'

import Home from '../views/AppHome.vue'

const MAIN_TITLE = 'Portail Cloud PI Native'

const routes = [
  {
    path: '/',
    name: 'Accueil',
    component: Home,
  },
  {
    path: '/documentation',
    name: 'Documentation',
    // component: Documentation,
  },
  {
    path: '/tableau-de-bord',
    name: 'Dashboard',
    // component: Dashboard,
  },
  {
    path: '/mes-services',
    name: 'MesServices',
    // component: MesServices,
  },
  {
    path: '/gestion-droits',
    name: 'GestionDroits',
    // component: GestionDroits,
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
