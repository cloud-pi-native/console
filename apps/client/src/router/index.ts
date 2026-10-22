import type {
  RouteLocationNormalizedGeneric,
  RouteRecordRaw,
} from 'vue-router'
import { logger } from '@cpn-console/logger/browser'
import { AdminAuthorized, swaggerUiPath } from '@cpn-console/shared'
import { nextTick } from 'vue'
import {
  createRouter,
  createWebHistory,
} from 'vue-router'
import { announce, routeAnnouncement } from '@/composables/useAnnouncer.js'
import { useProjectStore } from '@/stores/project.js'
import { useSystemSettingsStore } from '@/stores/system-settings.js'

import { useUserStore } from '@/stores/user.js'
import { consumePostLoginTarget, rememberPostLoginTarget } from '@/utils/auth-redirect.js'
import { uuid } from '@/utils/regex.js'
import DsoHome from '@/views/DsoHome.vue'
import NotFound from '@/views/NotFound.vue'

const AdminCluster = () => import('@/views/admin/AdminCluster.vue')
const AdminServiceChain = () => import('@/views/admin/AdminServiceChain.vue')
const ServicesHealth = () => import('@/views/ServicesHealth.vue')
const CreateProject = () => import('@/views/CreateProject.vue')
const ProfileWrapper = () => import('@/views/profile/ProfileWrapper.vue')
const UserInfo = () => import('@/views/profile/UserInfo.vue')
const PersonalAccessTokens = () => import('@/views/profile/PersonalAccessTokens.vue')
const DsoProjects = () => import('@/views/projects/DsoProjects.vue')
const DsoAdmin = () => import('@/views/admin/DsoAdmin.vue')
const ListUser = () => import('@/views/admin/ListUser.vue')
const ProjectDashboard = () => import('@/views/ProjectDashboard.vue')
const ListProjects = () => import('@/views/admin/ListProjects.vue')
const ListLogs = () => import('@/views/admin/ListLogs.vue')
const AdminRoles = () => import('@/views/admin/AdminRoles.vue')
const ListClusters = () => import('@/views/admin/ListClusters.vue')
const ListServiceChains = () => import('@/views/admin/ListServiceChains.vue')
const ListStages = () => import('@/views/admin/ListStages.vue')
const ListZones = () => import('@/views/admin/ListZones.vue')
const ListPlugins = () => import('@/views/admin/ListPlugins.vue')
const SystemSettings = () => import('@/views/admin/SystemSettings.vue')
const Maintenance = () => import('@/views/DsoMaintenance.vue')
const AdminTokens = () => import('@/views/admin/AdminTokens.vue')

const MAIN_TITLE = 'Console Cloud π Native'

export function detectProjectslug(to: Pick<RouteLocationNormalizedGeneric, 'params'>) {
  const slugParam = to.params.slug as string
  return uuid.test(slugParam)
    ? useProjectStore().projects.find(project => project.id === slugParam)?.slug
    : slugParam
}

export const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/login',
    name: 'Login',
    meta: { title: 'Connexion' },
    beforeEnter: async (_to, _from) => {
      const userStore = useUserStore()
      await userStore.login()
    },
    component: DsoProjects,
  },
  {
    path: '/logout',
    name: 'Logout',
    meta: { title: 'Déconnexion' },
    beforeEnter: async (_to, _from) => {
      const userStore = useUserStore()
      await userStore.logout()
    },
    component: DsoHome,
  },
  {
    path: '/',
    name: 'Home',
    meta: { title: 'Accueil' },
    component: DsoHome,
  },
  {
    path: '/profile',
    name: 'Profile',
    meta: { title: 'Mon profil' },
    component: ProfileWrapper,
    children: [
      {
        path: 'info',
        name: 'UserInfo',
        meta: { title: 'Informations personnelles' },
        component: UserInfo,
      },
      {
        path: 'tokens',
        name: 'PersonalAccessTokens',
        meta: { title: 'Jetons personnels' },
        component: PersonalAccessTokens,
      },
    ],
  },
  {
    path: '/maintenance',
    name: 'Maintenance',
    meta: { title: 'Maintenance' },
    component: Maintenance,
  },
  {
    path: '/services-health',
    name: 'ServicesHealth',
    meta: { title: 'État des services' },
    component: ServicesHealth,
  },

  {
    path: '/projects',
    children: [
      {
        path: '',
        name: 'Projects',
        meta: { title: 'Mes projets' },
        component: DsoProjects,
      },
      {
        path: ':slug',
        name: 'Project',
        meta: { title: 'Projet' },
        component: ProjectDashboard,
        async beforeEnter(to, _from, next) {
          if (typeof to.params.slug !== 'string') {
            return next({ name: 'Projects' })
          }
          if (!(to.params.slug in useProjectStore().projectsBySlug)) {
            await useProjectStore().getProject(to.params.slug).catch(async () => {
              logger.warn({ slug: to.params.slug }, 'Unable to find project information, redirecting to /projects')
              return next({ name: 'Projects' })
            })
          }
          useProjectStore().lastSelectedProjectSlug = to.params.slug
          return next()
        },
        props(to) {
          return {
            projectSlug: detectProjectslug(to),
            parentRoute: 'Projects',
            asProfile: 'user',
            tab: to.query.tab,
          }
        },
      },
    ],
  },
  {
    path: '/create-project',
    name: 'CreateProject',
    meta: { title: 'Créer un projet' },
    component: CreateProject,
  },
  {
    name: 'ParentAdmin',
    path: '/admin',
    meta: { title: 'Administration' },
    component: DsoAdmin,
    children: [
      {
        path: 'users',
        name: 'ListUser',
        meta: { title: 'Utilisateurs' },
        component: ListUser,
      },
      {
        path: 'projects',
        children: [
          {
            path: '',
            name: 'ListProjects',
            meta: { title: 'Projets' },
            component: ListProjects,
          },
          {
            path: ':slug',
            name: 'AdminProject',
            meta: { title: 'Projet (administration)' },
            component: ProjectDashboard,
            async beforeEnter(to, _from, next) {
              if (typeof to.params.slug !== 'string') {
                return next('/admin/projects')
              }
              await useProjectStore().getProject(to.params.slug)
              return next()
            },
            props(to) {
              return {
                projectSlug: detectProjectslug(to),
                parentRoute: 'ListProjects',
                asProfile: 'admin',
              }
            },
          },
        ],
      },
      {
        path: 'service-chains',
        children: [
          {
            path: '',
            name: 'ListServiceChains',
            meta: { title: 'Chaînes de services' },
            component: ListServiceChains,
          },
          {
            path: ':id',
            name: 'AdminServiceChain',
            meta: { title: 'Chaîne de services' },
            component: AdminServiceChain,
            props(to) {
              return {
                id: to.params.id,
              }
            },
          },
        ],
      },
      {
        path: 'logs',
        name: 'ListLogs',
        meta: { title: 'Journal' },
        component: ListLogs,
      },
      {
        path: 'clusters',
        children: [
          {
            path: '',
            name: 'ListClusters',
            meta: { title: 'Clusters' },
            component: ListClusters,
          },
          {
            path: ':id',
            name: 'AdminCluster',
            meta: { title: 'Cluster' },
            component: AdminCluster,
            props(to) {
              return {
                id: to.params.id,
              }
            },
          },
        ],
      },
      {
        path: 'stages',
        name: 'ListStages',
        meta: { title: 'Types d’environnement' },
        component: ListStages,
      },
      {
        path: 'zones',
        name: 'ListZones',
        meta: { title: 'Zones' },
        component: ListZones,
      },
      {
        path: 'plugins',
        name: 'ListPlugins',
        meta: { title: 'Plugins' },
        component: ListPlugins,
      },
      {
        path: 'system-settings',
        name: 'SystemSettings',
        meta: { title: 'Réglages console' },
        component: SystemSettings,
      },
      {
        path: 'roles',
        name: 'AdminRoles',
        meta: { title: 'Rôles' },
        component: AdminRoles,
      },
      {
        path: 'tokens',
        name: 'AdminTokens',
        meta: { title: 'Jetons d’API' },
        component: AdminTokens,
      },
    ],
  },
  {
    path: `${swaggerUiPath}-server`,
    name: 'Swagger-server',
    meta: { title: 'API (legacy)' },
    // no component, swagger plugin
    components: {},
    strict: false,
  },
  {
    path: `${swaggerUiPath}-server-nestjs`,
    name: 'Swagger-server-nestjs',
    meta: { title: 'API' },
    // no component, swagger plugin
    components: {},
    strict: false,
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    meta: { title: 'Page introuvable' },
    component: NotFound,
  },
]

export function createAppRouter(base?: string) {
  const router = createRouter({
    history: createWebHistory(base ?? (import.meta.env?.BASE_URL || '')),
    scrollBehavior: (to) => { if (to.hash && !to.hash.startsWith('#state=')) return ({ el: to.hash }) },
    routes,
  })
  router.afterEach((to, from) => {
    document.title = to.meta.title ? `${to.meta.title} - ${MAIN_TITLE}` : MAIN_TITLE
    announce(routeAnnouncement(to))

    // The initial load keeps the browser's default focus; only client-side
    // navigations move focus. Hash-only changes keep the target in view.
    const isHashOnlyChange = to.path === from.path && to.hash !== from.hash
    if (!from.name || isHashOnlyChange) return
    void nextTick(() => {
      document.getElementById('content')?.focus({ preventScroll: true })
    })
  })
  router.beforeEach(async (to, _from, next) => {
    const validPath = new Set(['Login', 'Home', 'Doc', 'NotFound', 'ServicesHealth', 'Maintenance', 'Logout', 'Swagger-server', 'Swagger-server-nestjs'])
    const userStore = useUserStore()
    const systemStore = useSystemSettingsStore()
    await userStore.setIsLoggedIn()
    if (
      !validPath.has(to.name?.toString() ?? '')
      && !userStore.isLoggedIn
    ) {
      rememberPostLoginTarget(to.fullPath)
      return next('/login')
    }
    if (to.name === 'Login' && userStore.isLoggedIn) {
      return next(consumePostLoginTarget() ?? '/')
    }
    if (
      !validPath.has(to.name?.toString() ?? '')
      && userStore.isLoggedIn
    ) {
      await systemStore.listSystemSettings()
      if (systemStore.systemSettingsByKey.maintenance?.value === 'on' && !AdminAuthorized.Manage(userStore.adminPerms)) return next('/maintenance')
    }
    next()
  })
  return router
}

const router = createAppRouter()

export const isInProject = computed(() => router.currentRoute.value.matched.some(route => route.name === 'Project'))
export const selectedProjectSlug = computed<string | undefined>(() => {
  if (router.currentRoute.value.matched.some(route => route.name === 'Project')) {
    return router.currentRoute.value.params.slug as string
  }
  return undefined
})
export default router
