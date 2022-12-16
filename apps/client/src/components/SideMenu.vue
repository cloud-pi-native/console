<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user.js'
import { useProjectStore } from '@/stores/project.js'

const route = useRoute()
const userStore = useUserStore()
const projectStore = useProjectStore()

const routeName = computed(() => route.name)
const routePath = computed(() => route.path)
const isLoggedIn = computed(() => userStore.isLoggedIn)
const selectedProject = computed(() => projectStore.selectedProject)

const isExpanded = ref({
  mainMenu: false,
  projects: false,
})

function toggleExpand (key) {
  isExpanded.value[key] = !isExpanded.value[key]
}

watch(routePath, (routePath) => {
  if (/projects*/.test(routePath)) {
    isExpanded.value.projects = true
    return
  }
  isExpanded.value.projects = false
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
              data-testid="menuMyProjects"
              :active="routeName === 'Projects'"
              to="/projects"
            >
              Mes projets
            </DsfrSideMenuLink>
          </DsfrSideMenuListItem>
          <div v-if="selectedProject">
            <DsfrSideMenuListItem>
              <DsfrSideMenuLink
                data-testid="menuDashboard"
                :active="routeName === 'Dashboard'"
                :to="`/projects/${selectedProject?.id}/dashboard`"
              >
                Tableau de bord
              </DsfrSideMenuLink>
            </DsfrSideMenuListItem>
            <DsfrSideMenuListItem>
              <DsfrSideMenuLink
                data-testid="menuServices"
                :active="routeName === 'Services'"
                :to="`/projects/${selectedProject?.id}/services`"
              >
                Mes services
              </DsfrSideMenuLink>
            </DsfrSideMenuListItem>
            <DsfrSideMenuListItem>
              <DsfrSideMenuLink
                data-testid="menuTeam"
                :active="routeName === 'Team'"
                :to="`/projects/${selectedProject?.id}/team`"
              >
                Gérer les droits
              </DsfrSideMenuLink>
            </DsfrSideMenuListItem>
            <DsfrSideMenuListItem>
              <DsfrSideMenuLink
                data-testid="menuRepos"
                :active="routeName === 'Repos'"
                :to="`/projects/${selectedProject?.id}/repos`"
              >
                Dépôts synchronisés
              </DsfrSideMenuLink>
            </DsfrSideMenuListItem>
          </div>
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
