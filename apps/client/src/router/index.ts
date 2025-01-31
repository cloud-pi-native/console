import {
  createRouter,
  createWebHistory,
} from 'vue-router'
import type {
  RouteLocationNormalizedGeneric,
  RouteRecordRaw,
} from 'vue-router'
import { useUserStore } from '@/stores/user.js'
import { useProjectStore } from '@/stores/project.js'
import { useSystemSettingsStore } from '@/stores/system-settings.js'

import DsoHome from '@/views/DsoHome.vue'
import NotFound from '@/views/NotFound.vue'
import { swaggerUiPath } from '@cpn-console/shared'

const ServicesHealth = () => import('@/views/ServicesHealth.vue')
const CreateProject = () => import('@/views/CreateProject.vue')
const ProfileWrapper = () => import('@/views/profile/ProfileWrapper.vue')
const UserInfo = () => import('@/views/profile/UserInfo.vue')
const PersonalAccessTokens = () => import('@/views/profile/PersonalAccessTokens.vue')
const ManageEnvironments = () => import('@/views/projects/ManageEnvironments.vue')
const DsoProjects = () => import('@/views/projects/DsoProjects.vue')
const DsoProjectWrapper = () => import('@/views/projects/DsoProjectWrapper.vue')
const DsoDashboard = () => import('@/views/projects/DsoDashboard.vue')
const DsoRoles = () => import('@/views/projects/DsoRoles.vue')
const DsoServices = () => import('@/views/projects/DsoServices.vue')
const DsoTeam = () => import('@/views/projects/DsoTeam.vue')
const DsoRepos = () => import('@/views/projects/DsoRepos.vue')
const DsoAdmin = () => import('@/views/admin/DsoAdmin.vue')
const ListUser = () => import('@/views/admin/ListUser.vue')
const AdminProject = () => import('@/views/admin/AdminProject.vue')
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

function propTheProjectParam(to: RouteLocationNormalizedGeneric) {
  return {
    projectSlug: Array.isArray(to.params.slug) ? to.params.slug[0] : to.params.slug,
  }
}
export const routes: Readonly<RouteRecordRaw[]> = [
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
    name: 'Profile',
    component: ProfileWrapper,
    children: [
      {
        path: 'info',
        name: 'UserInfo',
        component: UserInfo,
      },
      {
        path: 'tokens',
        name: 'PersonalAccessTokens',
        component: PersonalAccessTokens,
      },
    ],
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
    component: DsoProjectWrapper,
    props: propTheProjectParam,
    children: [
      {
        path: '',
        name: 'Projects',
        component: DsoProjects,
      },
      {
        path: ':slug',
        name: 'Project',
        async beforeEnter(to, _from, next) {
          if (typeof to.params.slug !== 'string') {
            return next({ name: 'Projects' })
          }
          if (!(to.params.slug in useProjectStore().projectsBySlug)) {
            await useProjectStore().getProject(to.params.slug).catch(async () => {
              console.log(`Unable to find project information, redirect to /projects`)
              return next({ name: 'Projects' })
            })
          }
          useProjectStore().lastSelectedProjectSlug = to.params.slug
          return next()
        },
        children: [
          {
            path: 'dashboard',
            name: 'Dashboard',
            component: DsoDashboard,
            props: propTheProjectParam,
          },
          {
            path: 'services',
            name: 'Services',
            component: DsoServices,
            props: propTheProjectParam,
          },
          {
            path: 'roles',
            name: 'ProjectRoles',
            component: DsoRoles,
            props: propTheProjectParam,
          },
          {
            path: 'team',
            name: 'Team',
            component: DsoTeam,
            props: propTheProjectParam,
          },
          {
            path: 'repositories',
            name: 'Repos',
            component: DsoRepos,
            props: propTheProjectParam,
          },
          {
            path: 'environments',
            name: 'Environments',
            component: ManageEnvironments,
            props: propTheProjectParam,
          },
        ],
      },
    ],
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
        path: 'projects/:slug',
        name: 'AdminProject',
        component: AdminProject,
        async beforeEnter(to, _from, next) {
          if (typeof to.params.slug !== 'string') {
            return next('/admin/projects')
          }
          await useProjectStore().getProject(to.params.slug)
          return next()
        },
        props(to) {
          return { projectSlug: to.params.slug }
        },
      },
      {
        path: 'projects',
        name: 'ListProjects',
        component: ListProjects,
        strict: false,
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
  {
    path: swaggerUiPath,
    name: 'Swagger',
    // no component, swagger plugin
    components: {},
    strict: false,
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
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
  const validPath = ['Login', 'Home', 'Doc', 'NotFound', 'ServicesHealth', 'Maintenance', 'Logout', 'Swagger']
  const userStore = useUserStore()
  const systemStore = useSystemSettingsStore()
  await userStore.setIsLoggedIn()

  // Redirige sur la page login si le path le requiert et l'utilisateur n'est pas connecté
  if (
    !validPath.includes(to.name?.toString() ?? '')
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
    !validPath.includes(to.name?.toString() ?? '')
    && userStore.isLoggedIn
  ) {
    await systemStore.listSystemSettings('maintenance')
    if (systemStore.systemSettingsByKey.maintenance?.value === 'on' && userStore.adminPerms === 0n) return next('/maintenance')
  }

  next()
})

export const isInProject = computed(() => router.currentRoute.value.matched.some(route => route.name === 'Project'))
export const selectedProjectSlug = computed<string | undefined>(() => {
  if (router.currentRoute.value.matched.some(route => route.name === 'Project')) {
    return router.currentRoute.value.params.slug as string
  }
  return undefined
})
export default router
