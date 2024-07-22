<script lang="ts" setup>
import { useUserStore } from '@/stores/user.js'
import { useProjectStore } from '@/stores/project.js'
import { ProjectAuthorized, AdminAuthorized } from '@cpn-console/shared'
import router from '../router/index.js'

const route = useRoute()
const userStore = useUserStore()
const projectStore = useProjectStore()

const routeName = computed(() => route.name)
const routePath = computed(() => route.path)
const isLoggedIn = computed(() => userStore.isLoggedIn)
const selectedProject = computed(() => projectStore.selectedProject)

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
})

function toggleExpand(key: keyof typeof isExpanded.value) {
  isExpanded.value[key] = !isExpanded.value[key]
}

watch(routePath, (routePath) => {
  if (/^\/projects*/.test(routePath)) {
    isExpanded.value.projects = true
    isExpanded.value.administration = false
    return
  }
  if (/admin*/.test(routePath)) {
    isExpanded.value.projects = false
    isExpanded.value.administration = true
    return
  }
  isExpanded.value.projects = false
  isExpanded.value.administration = false
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
      <p
        v-if="isLoggedIn"
        data-testid="whoami-hint"
        class="fr-hint-text fr-mb-2w cursor-pointer"
        @click="router.push('/profile')"
      >
        <span
          class="fr-icon-account-line"
          aria-hidden="true"
        />
        {{ userStore.userProfile?.firstName }} {{ userStore.userProfile?.lastName }}
      </p>
      <div
        class="my-2 flex flex-row gap-2 items-center cursor-pointer"
        @click="isDarkScheme = !isDarkScheme"
      >
        <v-icon
          :name="isDarkScheme ? 'ri-sun-line' : 'ri-moon-clear-line'"
          :fill="isDarkScheme ? 'var(--yellow-moutarde-sun-348-moon-860)' : 'var(--blue-france-sun-113-625)'"
        />
        <span
          class="fr-hint-text"
        >{{ isDarkScheme ? 'Thème clair': 'Thème sombre' }}</span>
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
      <!-- Onglet Projet -->
      <DsfrSideMenuListItem>
        <DsfrSideMenuLink
          data-testid="menuServicesHealth"
          :active="routeName === 'ServicesHealth'"
          to="/services-health"
        >
          Status des services
        </DsfrSideMenuLink>
      </DsfrSideMenuListItem>
      <DsfrSideMenuListItem
        v-if="isLoggedIn"
      >
        <DsfrSideMenuButton
          data-testid="menuProjectsBtn"
          :expanded="isExpanded.projects"
          button-label="Mes projets"
          control-id="projectsList"
          @toggle-expand="toggleExpand('projects')"
        >
          Projets
        </DsfrSideMenuButton>
        <DsfrSideMenuList
          id="projectsList"
          data-testid="menuProjectsList"
          :expanded="isExpanded.projects"
          :collapsable="true"
        >
          <DsfrSideMenuListItem>
            <DsfrSideMenuLink
              class="menu-link-icon"
              data-testid="menuMyProjects"
              :active="routeName === 'Projects'"
              to="/projects"
            >
              <v-icon name="ri-list-check" />
              Mes projets
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <div v-if="selectedProject">
            <DsfrSideMenuListItem>
              <DsfrSideMenuLink
                class="menu-link-icon"
                data-testid="menuDashboard"
                :active="routeName === 'Dashboard'"
                :to="`/projects/${selectedProject?.id}/dashboard`"
              >
                <v-icon name="ri-dashboard-line" />
                Tableau de bord
              </DsfrSideMenuLink>
            </DsfrSideMenuListItem>
            <DsfrSideMenuListItem>
              <DsfrSideMenuLink
                class="menu-link-icon"
                data-testid="menuServices"
                :active="routeName === 'Services'"
                :to="`/projects/${selectedProject?.id}/services`"
              >
                <v-icon name="ri-flow-chart" />
                Mes services
              </DsfrSideMenuLink>
            </DsfrSideMenuListItem>
            <DsfrSideMenuListItem>
              <DsfrSideMenuLink
                class="menu-link-icon"
                data-testid="menuTeam"
                :active="routeName === 'Team'"
                :to="`/projects/${selectedProject?.id}/team`"
              >
                <v-icon name="ri-team-line" />
                Équipe
              </DsfrSideMenuLink>
            </DsfrSideMenuListItem>
            <DsfrSideMenuListItem
              v-if="ProjectAuthorized.ManageRoles({ projectPermissions: projectStore.selectedProjectPerms})"
            >
              <DsfrSideMenuLink
                class="menu-link-icon"
                data-testid="menuProjectRole"
                :active="routeName === 'ProjectRoles'"
                :to="`/projects/${selectedProject?.id}/roles`"
              >
                <v-icon name="ri-admin-line" />
                Rôles
              </DsfrSideMenuLink>
            </DsfrSideMenuListItem>
            <DsfrSideMenuListItem
              v-if="ProjectAuthorized.ListRepositories({ projectPermissions: projectStore.selectedProjectPerms})"
            >
              <DsfrSideMenuLink
                class="menu-link-icon"
                data-testid="menuRepos"
                :active="routeName === 'Repos'"
                :to="`/projects/${selectedProject?.id}/repositories`"
              >
                <v-icon name="ri-git-branch-line" />
                Dépôts
              </DsfrSideMenuLink>
            </DsfrSideMenuListItem>
            <DsfrSideMenuListItem
              v-if="ProjectAuthorized.ListEnvironments({ projectPermissions: projectStore.selectedProjectPerms})"
            >
              <DsfrSideMenuLink
                class="menu-link-icon"
                data-testid="menuEnvironments"
                :active="routeName === 'Environments'"
                :to="`/projects/${selectedProject?.id}/environments`"
              >
                <v-icon name="ri-microsoft-line" />
                Environments
              </DsfrSideMenuLink>
            </DsfrSideMenuListItem>
          </div>
        </DsfrSideMenuList>
      </DsfrSideMenuListItem>

      <!-- Onglet Administration-->
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
          <DsfrSideMenuListItem
            v-if="AdminAuthorized.ManageRoles(userStore.adminPerms)"
          >
            <DsfrSideMenuLink
              class="menu-link-icon"
              data-testid="menuAdministrationUsers"
              :active="routeName === 'ListUser'"
              to="/admin/users"
            >
              <v-icon name="ri-folder-user-line" />
              Utilisateurs
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <DsfrSideMenuListItem
            v-if="AdminAuthorized.ManageOrganizations(userStore.adminPerms)"
          >
            <DsfrSideMenuLink
              class="menu-link-icon"
              data-testid="menuAdministrationOrganizations"
              :active="routeName === 'ListOrganizations'"
              to="/admin/organizations"
            >
              <v-icon name="ri-building-line" />
              Organisations
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <DsfrSideMenuListItem
            v-if="AdminAuthorized.ListProjects(userStore.adminPerms)"
          >
            <DsfrSideMenuLink
              class="menu-link-icon"
              data-testid="menuAdministrationProjects"
              :active="routeName === 'ListProjects'"
              to="/admin/projects"
            >
              <v-icon name="ri-folders-line" />
              Projets
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <DsfrSideMenuListItem
            v-if="AdminAuthorized.ManageRoles(userStore.adminPerms)"
          >
            <DsfrSideMenuLink
              class="menu-link-icon"
              data-testid="menuAdministrationRoles"
              :active="routeName === 'AdminRoles'"
              :to="`/admin/roles`"
            >
              <v-icon name="ri-admin-line" />
              Rôles
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <DsfrSideMenuListItem
            v-if="AdminAuthorized.ViewLogs(userStore.adminPerms)"
          >
            <DsfrSideMenuLink
              class="menu-link-icon"
              data-testid="menuAdministrationLogs"
              :active="routeName === 'ListLogs'"
              to="/admin/logs"
            >
              <v-icon name="ri-newspaper-line" />
              Journaux
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <DsfrSideMenuListItem
            v-if="AdminAuthorized.ManageClusters(userStore.adminPerms)"
          >
            <DsfrSideMenuLink
              class="menu-link-icon"
              data-testid="menuAdministrationClusters"
              :active="routeName === 'ListClusters'"
              to="/admin/clusters"
            >
              <v-icon name="ri-server-line" />
              Clusters
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <DsfrSideMenuListItem
            v-if="AdminAuthorized.ManageQuotas(userStore.adminPerms)"
          >
            <DsfrSideMenuLink
              class="menu-link-icon"
              data-testid="menuAdministrationQuotas"
              :active="routeName === 'ListQuotas'"
              to="/admin/quotas"
            >
              <v-icon name="ri-sound-module-line" />
              Quotas
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <DsfrSideMenuListItem
            v-if="AdminAuthorized.ManageStages(userStore.adminPerms)"
          >
            <DsfrSideMenuLink
              class="menu-link-icon"
              data-testid="menuAdministrationStages"
              :active="routeName === 'ListStages'"
              to="/admin/stages"
            >
              <v-icon name="ri-stock-line" />
              Types d'environnement
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <DsfrSideMenuListItem
            v-if="AdminAuthorized.ManageZones(userStore.adminPerms)"
          >
            <DsfrSideMenuLink
              class="menu-link-icon"
              data-testid="menuAdministrationZones"
              :active="routeName === 'ListZones'"
              to="/admin/zones"
            >
              <v-icon name="ri-focus-3-line" />
              Zones
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <DsfrSideMenuListItem
            v-if="AdminAuthorized.ManagePlugins(userStore.adminPerms)"
          >
            <DsfrSideMenuLink
              class="menu-link-icon"
              data-testid="menuAdministrationPlugins"
              :active="routeName === 'ListPlugins'"
              to="/admin/plugins"
            >
              <v-icon name="ri-settings-3-line" />
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
              <v-icon name="ri-tools-fill" />
              Réglages console
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
        </DsfrSideMenuList>
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
