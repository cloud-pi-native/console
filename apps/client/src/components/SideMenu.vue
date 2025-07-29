<script lang="ts" setup>
import { isInProject } from '../router/index'
import { useUserStore } from '@/stores/user'
import { useServiceStore } from '@/stores/services-monitor'

const route = useRoute()
const userStore = useUserStore()
const serviceStore = useServiceStore()

const routeName = computed(() => route.name)
const isLoggedIn = computed(() => userStore.isLoggedIn)

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
      class="mt-0 mb-4 ml-4"
      :expanded="isExpanded.mainMenu"
    >
      <DsfrSideMenuListItem>
        <DsfrSideMenuLink
          to=""
          class="flex flex-row gap-2 "
          @click="isDarkScheme = !isDarkScheme"
        >
          {{ isDarkScheme ? 'Thème clair' : 'Thème sombre' }}
          <v-icon
            :name="isDarkScheme ? 'ri:sun-line' : 'ri:moon-clear-line'"
            :fill="isDarkScheme ? 'var(--yellow-moutarde-sun-348-moon-860)' : 'var(--blue-france-sun-113-625)'"
          />
        </DsfrSideMenuLink>
      </DsfrSideMenuListItem>
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

      <!-- Onglet Administration -->
      <DsfrSideMenuListItem
        v-if="userStore.adminPerms"
        v-bind="{
          focusFirstAnchor: false,
        }"
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

.fr-sidemenu{
  display: flex;
}

.fr-sidemenu__inner{
  padding-bottom: 0;
  padding-right: 0;
  width: 100%;
}
</style>
