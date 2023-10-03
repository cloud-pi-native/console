<script lang="ts" setup>
import { useScheme } from '@gouvminint/vue-dsfr'
import { computed, ref, watch, onMounted, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user.js'
import { useProjectStore } from '@/stores/project.js'

const route = useRoute()
const userStore = useUserStore()
const projectStore = useProjectStore()

const routeName = computed(() => route.name)
const routePath = computed(() => route.path)
const isLoggedIn = computed(() => userStore.isLoggedIn)
const isAdmin = computed(() => userStore.isAdmin)
const selectedProject = computed(() => projectStore.selectedProject)

const isDarkPrefered = window.matchMedia(
  '(prefers-color-scheme: dark)',
).matches
const isDarkScheme = ref(isDarkPrefered)

const isExpanded = ref({
  mainMenu: false,
  projects: false,
  administration: false,
})

function toggleExpand (key: keyof typeof isExpanded.value) {
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
  const { setScheme } = useScheme()

  watchEffect(() => setScheme(isDarkScheme.value ? 'dark' : 'light'))
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
        class="fr-hint-text fr-mb-2w"
      >
        <span
          class="fr-icon-account-line"
          aria-hidden="true"
        />
        {{ userStore.userProfile.firstName }} {{ userStore.userProfile.lastName }}
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
      <DsfrSideMenuListItem
        v-if="isLoggedIn"
      >
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
            <DsfrSideMenuListItem>
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
            <DsfrSideMenuListItem>
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
        v-if="isAdmin"
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
              <v-icon name="ri-folder-user-line" />
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
              <v-icon name="ri-building-line" />
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
              <v-icon name="ri-folders-line" />
              Projets
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <DsfrSideMenuListItem>
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
          <DsfrSideMenuListItem>
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
        </DsfrSideMenuList>
      </DsfrSideMenuListItem>

      <DsfrSideMenuListItem>
        <DsfrSideMenuLink
          class="menu-link-icon"
          data-testid="menuDoc"
          :active="routeName === 'Doc'"
          to="https://github.com/cloud-pi-native/documentation"
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
