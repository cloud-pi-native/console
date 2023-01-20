import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user.js'
import { useProjectStore } from '@/stores/project.js'

import DsoHome from '@/views/DsoHome.vue'
import CreateProject from '@/views/CreateProject.vue'
import DsoProjects from '@/views/projects/DsoProjects.vue'
import DsoDashboard from '@/views/projects/DsoDashboard.vue'
import DsoServices from '@/views/projects/DsoServices.vue'
import DsoTeam from '@/views/projects/DsoTeam.vue'
import DsoRepos from '@/views/projects/DsoRepos.vue'
import DsoDoc from '@/views/DsoDoc.vue'

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
    },
    component: DsoProjects,
  },
  {
    path: '/logout',
    name: 'Logout',
    beforeEnter: async (to, from) => {
      const userStore = useUserStore()
      await userStore.logout()
    },
    component: DsoProjects,
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
    component: DsoDoc,
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env?.BASE_URL || ''),
  routes,
})

/**
 * Set application title
 */
router.beforeEach((to) => { // Cf. https://github.com/vueuse/head pour des transformations avancées de Head
  const specificTitle = to.meta.title ? `${to.meta.title} - ` : ''
  document.title = `${specificTitle}${MAIN_TITLE}`
})

/**
 * Redirect unlogged user to login view
 */
router.beforeEach(async (to, _from, next) => {
  const validPath = ['Login', 'Home', 'Doc']

  const userStore = useUserStore()
  userStore.setIsLoggedIn()
  if (validPath.includes(to.name) || userStore.isLoggedIn) {
    return next()
  }

  next('Login')
})

/**
 * On reload on projects views, retrieve projectId from url and send it to store
 */
router.beforeEach(async (to, _from, next) => {
  const projectStore = useProjectStore()
  const projectsPath = '/projects/'

  if (to.path.match(`^${projectsPath}[0-9a-f-]{36+}`) && projectStore.selectedProject === undefined) {
    await projectStore.getUserProjects()

    const idStart = projectsPath.length
    const projectId = to.path.slice(idStart, idStart + 36)
    await projectStore.setSelectedProject(projectId)
  }
  next()
})

export default router
