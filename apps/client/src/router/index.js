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
import DocIntroduction from '@/views/doc/DocIntroduction.vue'
import DocPrerequisites from '@/views/doc/DocPrerequisites.vue'
import DocTutorials from '@/views/doc/DocTutorials.vue'
import DocProjects from '@/views/doc/DocProjects.vue'
import DocUtils from '@/views/doc/DocUtils.vue'

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
    path: '/doc',
    name: 'Doc',
    component: DsoDoc,
    children: [
      {
        name: 'DocIntroduction',
        path: 'introduction',
        component: DocIntroduction,
      },
      {
        name: 'DocPrerequisites',
        path: 'prerequisites',
        component: DocPrerequisites,
      },
      {
        name: 'DocTutorials',
        path: 'tutorials',
        component: DocTutorials,
      },
      {
        name: 'DocProjects',
        path: 'projects',
        component: DocProjects,
      },
      {
        name: 'DocUtils',
        path: 'utils',
        component: DocUtils,
      },
    ],
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
  const validPath = [/^\/$/, /^\/login$/, /^\/logout$/, /^\/doc\/.*$/]

  const userStore = useUserStore()
  userStore.setIsLoggedIn()
  validPath.some(path => path.test(to.path))
  if (validPath.some(path => to.path.match(path)) || userStore.isLoggedIn) {
    return next()
  }

  next({ path: '/login' })
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
