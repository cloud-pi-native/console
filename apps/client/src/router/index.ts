import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from 'vue-router'

import { useUserStore } from '@/stores/user.js'
import { useProjectStore } from '@/stores/project.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { handleError } from '@/utils/func.js'

import DsoHome from '@/views/DsoHome.vue'
import NotFound from '@/views/NotFound.vue'
import { useUsersStore } from '@/stores/users.js'
const ServicesHealth = () => import('@/views/ServicesHealth.vue')
const CreateProject = () => import('@/views/CreateProject.vue')
const ManageEnvironments = () => import('@/views/projects/ManageEnvironments.vue')
const DsoProjects = () => import('@/views/projects/DsoProjects.vue')
const DsoDashboard = () => import('@/views/projects/DsoDashboard.vue')
const DsoServices = () => import('@/views/projects/DsoServices.vue')
const DsoTeam = () => import('@/views/projects/DsoTeam.vue')
const DsoRepos = () => import('@/views/projects/DsoRepos.vue')
const ListUser = () => import('@/views/admin/ListUser.vue')
const ListOrganizations = () => import('@/views/admin/ListOrganizations.vue')
const ListProjects = () => import('@/views/admin/ListProjects.vue')
const ListLogs = () => import('@/views/admin/ListLogs.vue')
const ListClusters = () => import('@/views/admin/ListClusters.vue')
const ListQuotas = () => import('@/views/admin/ListQuotas.vue')
const ListStages = () => import('@/views/admin/ListStages.vue')

const MAIN_TITLE = 'Console Cloud π Native'

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/login',
    name: 'Login',
    beforeEnter: async (_to, _from) => {
      const userStore = useUserStore()
      await userStore.login()
    },
    // TODO
    // @ts-ignore
    component: DsoProjects,
  },
  {
    path: '/logout',
    name: 'Logout',
    beforeEnter: async (_to, _from) => {
      const userStore = useUserStore()
      await userStore.logout()
    },
    // TODO
    // @ts-ignore
    component: DsoProjects,
  },
  {
    path: '/',
    name: 'Home',
    // TODO
    // @ts-ignore
    component: DsoHome,
  },
  {
    path: '/404',
    name: 'NotFound',
    // TODO
    // @ts-ignore
    component: NotFound,
  },
  {
    path: '/services-health',
    name: 'ServicesHealth',
    // TODO
    // @ts-ignore
    component: ServicesHealth,
  },
  {
    name: 'ParentProjects',
    path: '/projects',
    // TODO
    // @ts-ignore
    children: [
      {
        path: '',
        name: 'Projects',
        component: DsoProjects,
      },
      {
        path: ':id',
        name: 'Project',
        async beforeEnter (to) {
          await Promise.all([
            useUsersStore().getProjectUsers(to.params.id),
            useProjectStore().getUserProjects(),
          ])
        },
        children: [
          {
            path: 'dashboard',
            name: 'Dashboard',
            // TODO
            // @ts-ignore
            component: DsoDashboard,
          },
          {
            path: 'services',
            name: 'Services',
            // TODO
            // @ts-ignore
            component: DsoServices,
          },
          {
            path: 'team',
            name: 'Team',
            // TODO
            // @ts-ignore
            component: DsoTeam,
          },
          {
            path: 'repositories',
            name: 'Repos',
            // TODO
            // @ts-ignore
            component: DsoRepos,
          },
          {
            path: 'environments',
            name: 'Environments',
            // TODO
            // @ts-ignore
            component: ManageEnvironments,
          },
        ],
      },
    ],
  },
  {
    path: '/projects/create-project',
    name: 'CreateProject',
    // TODO
    // @ts-ignore
    component: CreateProject,
  },
  {
    path: '/admin/users',
    name: 'ListUser',
    // TODO
    // @ts-ignore
    component: ListUser,
  },
  {
    path: '/admin/organizations',
    name: 'ListOrganizations',
    // TODO
    // @ts-ignore
    component: ListOrganizations,
  },
  {
    path: '/admin/projects',
    name: 'ListProjects',
    // TODO
    // @ts-ignore
    component: ListProjects,
  },
  {
    path: '/admin/logs',
    name: 'ListLogs',
    // TODO
    // @ts-ignore
    component: ListLogs,
  },
  {
    path: '/admin/clusters',
    name: 'ListClusters',
    // TODO
    // @ts-ignore
    component: ListClusters,
  },
  {
    path: '/admin/quotas',
    name: 'ListQuotas',
    // TODO
    // @ts-ignore
    component: ListQuotas,
  },
  {
    path: '/admin/stages',
    name: 'ListeStages',
    // TODO
    // @ts-ignore
    component: ListStages,
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env?.BASE_URL || ''),
  scrollBehavior: (to) => { if (to.hash) return ({ el: to.hash }) },
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
  const validPath = ['Login', 'Home', 'Doc', 'NotFound']
  const snackbarStore = useSnackbarStore()
  const userStore = useUserStore()
  userStore.setIsLoggedIn()

  // Redirige sur la page login si le path le requiert et l'utilisateur n'est pas connecté
  if (
    typeof to.name === 'string' &&
    !validPath.includes(to.name) &&
    !userStore.isLoggedIn
  ) {
    return next('Login')
  }

  // Redirige sur l'accueil si le path est Login et que l'utilisateur est connecté
  if (to.name === 'Login' && userStore.isLoggedIn) {
    return next('/')
  }

  // Redirige sur la page d'accueil si le path est admin et l'utilisateur n'est pas admin
  if (to.path.match('^/admin/') && !userStore.isAdmin) {
    snackbarStore.setMessage(
      'Vous ne possédez pas les droits administeurs',
      'error',
    )
    return next('/')
  }

  // Redirige vers une 404 si la page n'existe pas
  if (to.name === undefined) {
    return next('/404')
  }

  next()
})

/**
 * On reload on projects views, retrieve projectId from url and send it to store
 */
router.beforeEach(async (to, _from, next) => {
  const projectStore = useProjectStore()
  const projectsPath = '/projects/'

  if (
    to.path.match('^/projects/') &&
    to.name !== 'CreateProject' &&
    projectStore.selectedProject === undefined
  ) {
    try {
      await projectStore.getUserProjects()
    } catch (error) {
      handleError(error)
    }

    const idStart = projectsPath.length
    const projectId = to.path.slice(idStart, idStart + 36)
    projectStore.setSelectedProject(projectId)
  }
  next()
})

export default router
