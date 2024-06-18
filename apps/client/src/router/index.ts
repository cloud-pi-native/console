import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from 'vue-router'

import { useUserStore } from '@/stores/user.js'
import { useProjectStore } from '@/stores/project.js'
import { useSnackbarStore } from '@/stores/snackbar.js'

import DsoHome from '@/views/DsoHome.vue'
import NotFound from '@/views/NotFound.vue'
import { useUsersStore } from '@/stores/users.js'
import { uuid } from '@/utils/regex.js'
const DsoTos = () => import('@/views/DsoTos.vue')
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
const ListZones = () => import('@/views/admin/ListZones.vue')
const ListPlugins = () => import('@/views/admin/ListPlugins.vue')

const MAIN_TITLE = 'Console Cloud π Native'

const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/login',
    name: 'Login',
    beforeEnter: async (_to, _from) => {
      const userStore = useUserStore()
      await userStore.login()
    },
    component: DsoProjects,
  },
  {
    path: '/logout',
    name: 'Logout',
    beforeEnter: async (_to, _from) => {
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
    path: '/404',
    name: 'NotFound',
    component: NotFound,
  },
  {
    path: '/cgu',
    name: 'CGU',
    component: DsoTos,
  },
  {
    path: '/services-health',
    name: 'ServicesHealth',
    component: ServicesHealth,
  },
  {
    name: 'ParentProjects',
    path: '/projects',
    children: [
      {
        path: '',
        name: 'Projects',
        component: DsoProjects,
      },
      {
        path: ':id',
        name: 'Project',
        async beforeEnter (to, _from, next) {
          if (typeof to.params.id !== 'string' || !to.params.id.match(uuid)) {
            return next('/projects')
          }
          await Promise.all([
            useUsersStore().getProjectUsers(to.params.id),
            useProjectStore().setSelectedProject(to.params.id),
          ])
          return next()
        },
        children: [
          {
            path: 'dashboard',
            name: 'Dashboard',
            component: DsoDashboard,
          },
          {
            path: 'services',
            name: 'Services',
            component: DsoServices,
          },
          {
            path: 'team',
            name: 'Team',
            component: DsoTeam,
          },
          {
            path: 'repositories',
            name: 'Repos',
            component: DsoRepos,
          },
          {
            path: 'environments',
            name: 'Environments',
            component: ManageEnvironments,
          },
        ],
      },
    ],
    async beforeEnter () {
      await useProjectStore().getUserProjects()
    },
  },
  {
    path: '/projects/create-project',
    name: 'CreateProject',
    component: CreateProject,
  },
  {
    path: '/admin/users',
    name: 'ListUser',
    component: ListUser,
  },
  {
    path: '/admin/organizations',
    name: 'ListOrganizations',
    component: ListOrganizations,
  },
  {
    path: '/admin/projects',
    name: 'ListProjects',
    component: ListProjects,
  },
  {
    path: '/admin/logs',
    name: 'ListLogs',
    component: ListLogs,
  },
  {
    path: '/admin/clusters',
    name: 'ListClusters',
    component: ListClusters,
  },
  {
    path: '/admin/quotas',
    name: 'ListQuotas',
    component: ListQuotas,
  },
  {
    path: '/admin/stages',
    name: 'ListStages',
    component: ListStages,
  },
  {
    path: '/admin/zones',
    name: 'ListZones',
    component: ListZones,
  },
  {
    path: '/admin/plugins',
    name: 'ListPlugins',
    component: ListPlugins,
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env?.BASE_URL || ''),
  scrollBehavior: (to) => { if (to.hash && !to.hash.match(/^#state=/)) return ({ el: to.hash }) },
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
  const validPath = ['Login', 'Home', 'Doc', 'NotFound', 'CGU', 'ServicesHealth']
  const snackbarStore = useSnackbarStore()
  const userStore = useUserStore()
  userStore.setIsLoggedIn()

  // Redirige sur la page login si le path le requiert et l'utilisateur n'est pas connecté
  if (
    typeof to.name === 'string' &&
    !validPath.includes(to.name) &&
    !userStore.isLoggedIn
  ) {
    return next('/login')
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

export default router
