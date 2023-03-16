import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user.js'
import { useProjectStore } from '@/stores/project.js'
import { useSnackbarStore } from '@/stores/snackbar.js'

import DsoHome from '@/views/DsoHome.vue'
import ServicesHealth from '@/views/ServicesHealth.vue'
import CreateProject from '@/views/CreateProject.vue'
import ManageEnvironments from '@/views/projects/ManageEnvironments.vue'
import DsoProjects from '@/views/projects/DsoProjects.vue'
import DsoDashboard from '@/views/projects/DsoDashboard.vue'
import DsoServices from '@/views/projects/DsoServices.vue'
import DsoTeam from '@/views/projects/DsoTeam.vue'
import DsoRepos from '@/views/projects/DsoRepos.vue'
import DsoDoc from '@/views/DsoDoc.vue'
import ListUser from '@/views/admin/ListUser.vue'

const MAIN_TITLE = 'Console Cloud π Native'

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
    path: '/services-health',
    name: 'ServicesHealth',
    component: ServicesHealth,
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
    path: '/projects/:id/repositories',
    name: 'Repos',
    component: DsoRepos,
  },
  {
    path: '/projects/:id/environments',
    name: 'Environments',
    component: ManageEnvironments,
  },
  {
    path: '/admin/users',
    name: 'ListUser',
    component: ListUser,
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
  const snackbarStore = useSnackbarStore()
  const userStore = useUserStore()
  userStore.setIsLoggedIn()

  // Redirige sur la page login si le path le requiert et l'utilisateur n'est pas connecté
  if (!validPath.includes(to.name) && !userStore.isLoggedIn) {
    return next('Login')
  }

  // Redirige sur la page d'accueil si le path est admin et l'utilisateur n'est pas admin
  if (to.path.match('^/admin/') && !userStore.isAdmin) {
    snackbarStore.setMessage('Vous ne possédez pas les droits administeurs', 'error')
    return next('/')
  }

  next()
})

/**
 * On reload on projects views, retrieve projectId from url and send it to store
 */
router.beforeEach(async (to, _from, next) => {
  const snackbarStore = useSnackbarStore()
  const projectStore = useProjectStore()
  const projectsPath = '/projects/'

  if (to.path.match('^/projects/') && to.name !== 'CreateProject' && projectStore.selectedProject === undefined) {
    try {
      await projectStore.getUserProjects()
    } catch (error) {
      snackbarStore.setMessage(error?.message, 'error')
    }

    const idStart = projectsPath.length
    const projectId = to.path.slice(idStart, idStart + 36)
    await projectStore.setSelectedProject(projectId)
  }
  next()
})

export default router
