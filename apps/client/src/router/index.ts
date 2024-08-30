import {
  type RouteRecordRaw,
  createRouter,
  createWebHistory,
} from 'vue-router'
import { useUserStore } from '@/stores/user.js'
import { useProjectStore } from '@/stores/project.js'
import { useSystemSettingsStore } from '@/stores/system-settings.js'
import { uuid } from '@/utils/regex.js'

import DsoHome from '@/views/DsoHome.vue'
import NotFound from '@/views/NotFound.vue'

const ServicesHealth = () => import('@/views/ServicesHealth.vue')
const CreateProject = () => import('@/views/CreateProject.vue')
const UserProfile = () => import('@/views/UserProfile.vue')
const ManageEnvironments = () => import('@/views/projects/ManageEnvironments.vue')
const DsoProjects = () => import('@/views/projects/DsoProjects.vue')
const DsoDashboard = () => import('@/views/projects/DsoDashboard.vue')
const DsoRoles = () => import('@/views/projects/DsoRoles.vue')
const DsoServices = () => import('@/views/projects/DsoServices.vue')
const DsoTeam = () => import('@/views/projects/DsoTeam.vue')
const DsoRepos = () => import('@/views/projects/DsoRepos.vue')
const DsoAdmin = () => import('@/views/admin/DsoAdmin.vue')
const ListUser = () => import('@/views/admin/ListUser.vue')
const ListOrganizations = () => import('@/views/admin/ListOrganizations.vue')
const ListProjects = () => import('@/views/admin/ListProjects.vue')
const ListLogs = () => import('@/views/admin/ListLogs.vue')
const AdminRoles = () => import('@/views/admin/AdminRoles.vue')
const ListClusters = () => import('@/views/admin/ListClusters.vue')
const ListQuotas = () => import('@/views/admin/ListQuotas.vue')
const ListStages = () => import('@/views/admin/ListStages.vue')
const ListZones = () => import('@/views/admin/ListZones.vue')
const ListPlugins = () => import('@/views/admin/ListPlugins.vue')
const SystemSettings = () => import('@/views/admin/SystemSettings.vue')
const Maintenance = () => import('@/views/DsoMaintenance.vue')
const AdminTokens = () => import('@/views/admin/AdminTokens.vue')

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
    path: '/profile',
    name: 'UserProfile',
    component: UserProfile,
  },
  {
    path: '/404',
    name: 'NotFound',
    component: NotFound,
  },
  {
    path: '/maintenance',
    name: 'Maintenance',
    component: Maintenance,
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
        async beforeEnter(to, _from, next) {
          if (typeof to.params.id !== 'string' || !uuid.exec(to.params.id)) {
            return next('/projects')
          }
          useProjectStore().setSelectedProject(to.params.id)
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
            path: 'roles',
            name: 'ProjectRoles',
            component: DsoRoles,
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
    async beforeEnter() {
      await useProjectStore().listProjects()
    },
  },
  {
    path: '/projects/create-project',
    name: 'CreateProject',
    component: CreateProject,
  },
  {
    name: 'ParentAdmin',
    path: '/admin',
    component: DsoAdmin,
    children: [
      {
        path: 'users',
        name: 'ListUser',
        component: ListUser,
      },
      {
        path: 'organizations',
        name: 'ListOrganizations',
        component: ListOrganizations,
      },
      {
        path: 'projects',
        name: 'ListProjects',
        component: ListProjects,
      },
      {
        path: 'logs',
        name: 'ListLogs',
        component: ListLogs,
      },
      {
        path: 'clusters',
        name: 'ListClusters',
        component: ListClusters,
      },
      {
        path: 'quotas',
        name: 'ListQuotas',
        component: ListQuotas,
      },
      {
        path: 'stages',
        name: 'ListStages',
        component: ListStages,
      },
      {
        path: 'zones',
        name: 'ListZones',
        component: ListZones,
      },
      {
        path: 'plugins',
        name: 'ListPlugins',
        component: ListPlugins,
      },
      {
        path: 'system-settings',
        name: 'SystemSettings',
        component: SystemSettings,
      },
      {
        path: 'roles',
        name: 'AdminRoles',
        component: AdminRoles,
      },
      {
        path: 'tokens',
        name: 'AdminTokens',
        component: AdminTokens,
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env?.BASE_URL || ''),
  scrollBehavior: (to) => { if (to.hash && !/^#state=/.exec(to.hash)) return ({ el: to.hash }) },
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
  const validPath = ['Login', 'Home', 'Doc', 'NotFound', 'ServicesHealth', 'Maintenance', 'Logout']
  const userStore = useUserStore()
  const systemStore = useSystemSettingsStore()
  await userStore.setIsLoggedIn()

  // Redirige vers une 404 si la page n'existe pas
  if (to.name === undefined || typeof to.name === 'symbol') {
    return next('/404')
  }

  // Redirige sur la page login si le path le requiert et l'utilisateur n'est pas connecté
  if (
    !validPath.includes(to.name)
    && !userStore.isLoggedIn
  ) {
    return next('/login')
  }

  // Redirige sur l'accueil si le path est Login et que l'utilisateur est connecté
  if (to.name === 'Login' && userStore.isLoggedIn) {
    return next('/')
  }

  // Redirige vers la page maintenance si la maintenance est activée
  if (
    !validPath.includes(to.name)
    && userStore.isLoggedIn
  ) {
    await systemStore.listSystemSettings('maintenance')
    if (systemStore.systemSettings?.maintenance === 'on' && userStore.adminPerms === 0n) return next('/maintenance')
  }

  next()
})

export default router
