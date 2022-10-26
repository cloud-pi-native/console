<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user.js'

const route = useRoute()
const userStore = useUserStore()

const routeName = computed(() => route.name)

const isLoggedIn = computed(() => userStore.isLoggedIn)

const isExpanded = ref({
  mainMenu: false,
  projects: false,
})

function toggleExpand (key) {
  isExpanded.value[key] = !isExpanded.value[key]
}

watch(routeName, () => {
  Object.keys(isExpanded.value)
    .filter(key => {
      if (['Services', 'Dashboard', 'Team'].includes(routeName.value)) {
        return key !== 'projects'
      }
      return true
    })
    .forEach(key => {
      isExpanded.value[key] = false
    })
})

</script>

<template>
  <!-- TODO : voir https://discord.com/channels/690194719011242153/797040508508700692/1025424011133472838 -->
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
      <DsfrSideMenuListItem>
        <DsfrSideMenuLink
          data-testid="menuHome"
          :active="routeName === 'Home'"
          to="/"
        >
          Accueil
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
          Mes projets
        </DsfrSideMenuButton>
        <DsfrSideMenuList
          id="projectsList"
          data-testid="menuProjectsList"
          :expanded="isExpanded.projects"
          :collapsable="true"
        >
          <DsfrSideMenuListItem>
            <DsfrSideMenuLink
              data-testid="menuDashboard"
              :active="routeName === 'Dashboard'"
              to="/dashboard"
            >
              Tableau de bord
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <DsfrSideMenuListItem>
            <DsfrSideMenuLink
              data-testid="menuServices"
              :active="routeName === 'Services'"
              to="/services"
            >
              Mes services
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <DsfrSideMenuListItem>
            <DsfrSideMenuLink
              data-testid="menuTeam"
              :active="routeName === 'Team'"
              to="/team"
            >
              Gérer les droits
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
        </DsfrSideMenuList>
      </DsfrSideMenuListItem>
      <DsfrSideMenuListItem>
        <DsfrSideMenuLink
          data-testid="menuDoc"
          :active="routeName === 'Doc'"
          to="/doc"
        >
          Documentation
        </DsfrSideMenuLink>
      </DsfrSideMenuListItem>
    </DsfrSideMenuList>
  </DsfrSideMenu>
</template>

<!-- TODO : voir https://discord.com/channels/690194719011242153/797040508508700692/1025426773380431975 -->
<style scoped>
.fr-sidemenu__btn[aria-current="false"] {
  color: var(--text-action-high-grey)
}

.fr-sidemenu__btn[aria-current="false"]::before {
  display: none;
}
</style>
