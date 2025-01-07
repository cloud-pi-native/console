<script lang="ts" setup>
import { ProjectAuthorized } from '@cpn-console/shared'
import router, { isInProject } from '../router/index.js'
import { useUserStore } from '@/stores/user.js'
import { useProjectStore } from '@/stores/project.js'
import { useServiceStore } from '@/stores/services-monitor.js'
import type { Project } from '@/utils/project-utils.js'

const route = useRoute()
const userStore = useUserStore()
const projectStore = useProjectStore()
const serviceStore = useServiceStore()

const routeName = computed(() => route.name)
const isLoggedIn = computed(() => userStore.isLoggedIn)
const selectedProjectId = computed<string | undefined>(() => {
  if (router.currentRoute.value.matched.some(route => route.name === 'Project')) {
    return router.currentRoute.value.params.id as string
  }
  return undefined
})
const project = computed<Project | undefined>(() => projectStore.projectsById[selectedProjectId.value ?? ''])

const isDarkScheme = ref<boolean>()
const selectedScheme = computed<string | undefined>(() =>
  isDarkScheme.value
    ? 'dark'
    : 'light',
)

const isExpanded = ref({
  mainMenu: false,
  projects: false,
  administration: false,
  profile: false,
})

function toggleExpand(key: keyof typeof isExpanded.value) {
  isExpanded.value[key] = !isExpanded.value[key]
}

watch(route, (currentRoute) => {
  isExpanded.value.projects = isInProject.value
  isExpanded.value.profile = currentRoute.matched.some(match => match.name === 'Profile')
  isExpanded.value.administration = currentRoute.matched.some(match => match.name === 'ParentAdmin')
})

onMounted(() => {
  // @ts-ignore
  const { scheme, setScheme } = useScheme()

  isDarkScheme.value = scheme.value === 'dark'

  watchEffect(() => setScheme(selectedScheme.value))
})
</script>

<template>
  <DsfrSideMenu
    id="mainMenu"
    data-testid="mainMenu"
    heading-title=""
    button-label="Menu"
    @toggle-expand="toggleExpand('mainMenu')"
  >
    <DsfrSideMenuList
      id="menuList"
      :expanded="isExpanded.mainMenu"
    >
      <div
        class="my-2 flex flex-row gap-2 items-center cursor-pointer"
        @click="isDarkScheme = !isDarkScheme"
      >
        <v-icon
          :name="isDarkScheme ? 'ri:sun-line' : 'ri:moon-clear-line'"
          :fill="isDarkScheme ? 'var(--yellow-moutarde-sun-348-moon-860)' : 'var(--blue-france-sun-113-625)'"
        />
        <span
          class="fr-hint-text"
        >{{ isDarkScheme ? 'Thème clair' : 'Thème sombre' }}</span>
      </div>
      <DsfrSideMenuListItem>
        <DsfrSideMenuLink
          data-testid="menuHome"
          :active="routeName === 'Home'"
          to="/"
        >
          Accueil
        </DsfrSideMenuLink>
      </DsfrSideMenuListItem>

      <!-- Onglet Profile -->
      <DsfrSideMenuListItem
        v-if="isLoggedIn"
      >
        <DsfrSideMenuButton
          data-testid="menuUserList"
          :expanded="isExpanded.profile"
          button-label="Mon profil"
          control-id="projectList"
          @toggle-expand="toggleExpand('profile')"
        >
          {{ userStore.userProfile?.firstName }} {{ userStore.userProfile?.lastName }}
        </DsfrSideMenuButton>
        <DsfrSideMenuList
          id="profileList"
          :expanded="isExpanded.profile"
          :collapsable="true"
        >
          <div>
            <DsfrSideMenuListItem>
              <DsfrSideMenuLink
                class="menu-link-icon"
                data-testid="menuUserInfo"
                :active="routeName === 'UserInfo'"
                to="/profile/info"
              >
                <v-icon name="ri:dashboard-line" />
                Mon profil
              </DsfrSideMenuLink>
            </DsfrSideMenuListItem>
            <DsfrSideMenuListItem>
              <DsfrSideMenuLink
                class="menu-link-icon"
                data-testid="menuUserTokens"
                :active="routeName === 'PersonalAccessTokens'"
                to="/profile/tokens"
              >
                <v-icon name="ri:key-2-line" />
                Jetons personnels
              </DsfrSideMenuLink>
            </DsfrSideMenuListItem>
          </div>
        </DsfrSideMenuList>
      </DsfrSideMenuListItem>

      <!-- Onglet Projet -->
      <DsfrSideMenuListItem>
        <DsfrSideMenuLink
          v-if="isLoggedIn"
          data-testid="menuMyProjects"
          :active="routeName === 'Projects'"
          to="/projects"
        >
          Mes projets
        </DsfrSideMenuLink>
      </DsfrSideMenuListItem>
      <DsfrSideMenuListItem
        v-if="isLoggedIn"
        :class="`transition-all ${project ? '' : 'hidden'}`"
      >
        <DsfrSideMenuButton
          data-testid="menuProjectBtn"
          :expanded="isExpanded.projects"
          button-label="Mes projets"
          control-id="projectList"
          @toggle-expand="toggleExpand('projects')"
        >
          Projet {{ project?.name }}
        </DsfrSideMenuButton>
        <DsfrSideMenuList
          id="projectList"
          data-testid="menuProjectList"
          :expanded="isExpanded.projects"
          :collapsable="true"
        >
          <div>
            <DsfrSideMenuListItem>
              <DsfrSideMenuLink
                class="menu-link-icon"
                data-testid="menuDashboard"
                :active="routeName === 'Dashboard'"
                :to="`/projects/${project?.id}/dashboard`"
              >
                <v-icon name="ri:dashboard-line" />
                Tableau de bord
              </DsfrSideMenuLink>
            </DsfrSideMenuListItem>
            <DsfrSideMenuListItem>
              <DsfrSideMenuLink
                class="menu-link-icon"
                data-testid="menuServices"
                :active="routeName === 'Services'"
                :to="`/projects/${project?.id}/services`"
              >
                <v-icon name="ri:flow-chart" />
                Services externes
              </DsfrSideMenuLink>
            </DsfrSideMenuListItem>
            <DsfrSideMenuListItem>
              <DsfrSideMenuLink
                class="menu-link-icon"
                data-testid="menuTeam"
                :active="routeName === 'Team'"
                :to="`/projects/${project?.id}/team`"
              >
                <v-icon name="ri:team-line" />
                Équipe
              </DsfrSideMenuLink>
            </DsfrSideMenuListItem>
            <DsfrSideMenuListItem
              v-if="ProjectAuthorized.ManageRoles({ projectPermissions: project?.myPerms })"
            >
              <DsfrSideMenuLink
                class="menu-link-icon"
                data-testid="menuProjectRole"
                :active="routeName === 'ProjectRoles'"
                :to="`/projects/${project?.id}/roles`"
              >
                <v-icon name="ri:admin-line" />
                Rôles
              </DsfrSideMenuLink>
            </DsfrSideMenuListItem>
            <DsfrSideMenuListItem
              v-if="ProjectAuthorized.ListRepositories({ projectPermissions: project?.myPerms })"
            >
              <DsfrSideMenuLink
                class="menu-link-icon"
                data-testid="menuRepos"
                :active="routeName === 'Repos'"
                :to="`/projects/${project?.id}/repositories`"
              >
                <v-icon name="ri:git-branch-line" />
                Dépôts
              </DsfrSideMenuLink>
            </DsfrSideMenuListItem>
            <DsfrSideMenuListItem
              v-if="ProjectAuthorized.ListEnvironments({ projectPermissions: project?.myPerms })"
            >
              <DsfrSideMenuLink
                class="menu-link-icon"
                data-testid="menuEnvironments"
                :active="routeName === 'Environments'"
                :to="`/projects/${project?.id}/environments`"
              >
                <v-icon name="ri:microsoft-line" />
                Environnements
              </DsfrSideMenuLink>
            </DsfrSideMenuListItem>
          </div>
        </DsfrSideMenuList>
      </DsfrSideMenuListItem>

      <!-- Onglet Administration -->
      <DsfrSideMenuListItem
        v-if="userStore.adminPerms"
      >
        <DsfrSideMenuButton
          data-testid="menuAdministrationBtn"
          :expanded="isExpanded.administration"
          button-label="Administration"
          control-id="administrationList"
          @toggle-expand="toggleExpand('administration')"
        >
          Administration
        </DsfrSideMenuButton>
        <DsfrSideMenuList
          id="administrationList"
          data-testid="menuAdministrationList"
          :expanded="isExpanded.administration"
          :collapsable="true"
        >
          <DsfrSideMenuListItem>
            <DsfrSideMenuLink
              class="menu-link-icon"
              data-testid="menuAdministrationUsers"
              :active="routeName === 'ListUser'"
              to="/admin/users"
            >
              <v-icon name="ri:folder-user-line" />
              Utilisateurs
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <DsfrSideMenuListItem>
            <DsfrSideMenuLink
              class="menu-link-icon"
              data-testid="menuAdministrationOrganizations"
              :active="routeName === 'ListOrganizations'"
              to="/admin/organizations"
            >
              <v-icon name="ri:building-line" />
              Organisations
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <DsfrSideMenuListItem>
            <DsfrSideMenuLink
              class="menu-link-icon"
              data-testid="menuAdministrationProjects"
              :active="routeName === 'ListProjects'"
              to="/admin/projects"
            >
              <v-icon name="ri:folders-line" />
              Projets
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <DsfrSideMenuListItem>
            <DsfrSideMenuLink
              class="menu-link-icon"
              data-testid="menuAdministrationRoles"
              :active="routeName === 'AdminRoles'"
              to="/admin/roles"
            >
              <v-icon name="ri:admin-line" />
              Rôles
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <DsfrSideMenuListItem>
            <DsfrSideMenuLink
              class="menu-link-icon"
              data-testid="menuAdministrationLogs"
              :active="routeName === 'ListLogs'"
              to="/admin/logs"
            >
              <v-icon name="ri:newspaper-line" />
              Journaux
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <DsfrSideMenuListItem>
            <DsfrSideMenuLink
              class="menu-link-icon"
              data-testid="menuAdministrationClusters"
              :active="routeName === 'ListClusters'"
              to="/admin/clusters"
            >
              <v-icon name="ri:server-line" />
              Clusters
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <DsfrSideMenuListItem>
            <DsfrSideMenuLink
              class="menu-link-icon"
              data-testid="menuAdministrationQuotas"
              :active="routeName === 'ListQuotas'"
              to="/admin/quotas"
            >
              <v-icon name="ri:sound-module-line" />
              Quotas
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <DsfrSideMenuListItem>
            <DsfrSideMenuLink
              class="menu-link-icon"
              data-testid="menuAdministrationStages"
              :active="routeName === 'ListStages'"
              to="/admin/stages"
            >
              <v-icon name="ri:stock-line" />
              Types d'environnement
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <DsfrSideMenuListItem>
            <DsfrSideMenuLink
              class="menu-link-icon"
              data-testid="menuAdministrationZones"
              :active="routeName === 'ListZones'"
              to="/admin/zones"
            >
              <v-icon name="ri:focus-3-line" />
              Zones
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <DsfrSideMenuListItem>
            <DsfrSideMenuLink
              class="menu-link-icon"
              data-testid="menuAdministrationPlugins"
              :active="routeName === 'ListPlugins'"
              to="/admin/plugins"
            >
              <v-icon name="ri:settings-3-line" />
              Plugins
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <DsfrSideMenuListItem>
            <DsfrSideMenuLink
              class="menu-link-icon"
              data-testid="menuAdministrationSystemSettings"
              :active="routeName === 'SystemSettings'"
              to="/admin/system-settings"
            >
              <v-icon name="ri:tools-line" />
              Réglages console
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <DsfrSideMenuListItem>
            <DsfrSideMenuLink
              class="menu-link-icon"
              data-testid="menuAdministrationToken"
              :active="routeName === 'AdminTokens'"
              to="/admin/tokens"
            >
              <v-icon name="ri:key-2-line" />
              Jetons d'API
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
        </DsfrSideMenuList>
      </DsfrSideMenuListItem>
      <DsfrSideMenuListItem>
        <DsfrSideMenuLink
          data-testid="menuServicesHealth"
          :active="routeName === 'ServicesHealth'"
          to="/services-health"
          class="flex flex-row space-between"
        >
          <span
            class="grow"
          >
            Status des services
          </span>
          <v-icon
            :fill="serviceStore.servicesHealth.dotColor"
            name="ri:checkbox-blank-circle-fill"
            class="h-3"
          />
        </DsfrSideMenuLink>
      </DsfrSideMenuListItem>
      <DsfrSideMenuListItem>
        <DsfrSideMenuLink
          class="menu-link-icon"
          data-testid="menuDoc"
          :active="routeName === 'Doc'"
          to="https://cloud-pi-native.fr"
          target="_blank"
        >
          Documentation
        </DsfrSideMenuLink>
      </DsfrSideMenuListItem>
    </DsfrSideMenuList>
  </DsfrSideMenu>
</template>

<style>
.menu-link-icon {
  @apply flex gap-2;
}
</style>
