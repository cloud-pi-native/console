<script setup>
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
const selectedProject = computed(() => projectStore.selectedProject)

const isDarkPrefered = window.matchMedia(
  '(prefers-color-scheme: dark)',
).matches
const isDarkScheme = ref(isDarkPrefered)

const isExpanded = ref({
  mainMenu: false,
  projects: false,
  doc: false,
})

function toggleExpand (key) {
  isExpanded.value[key] = !isExpanded.value[key]
}

watch(routePath, (routePath) => {
  if (/doc*/.test(routePath)) {
    isExpanded.value.doc = true
    isExpanded.value.projects = false
    return
  }
  if (/projects*/.test(routePath)) {
    isExpanded.value.projects = true
    isExpanded.value.doc = false
    return
  }
  isExpanded.value.doc = false
  isExpanded.value.projects = false
})

onMounted(() => {
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
                :to="`/projects/${selectedProject?.id}/repositories`"
              >
                Dépôts synchronisés
              </DsfrSideMenuLink>
            </DsfrSideMenuListItem>
            <!-- TODO : enlever v-if lorsque les playbooks seront intégrés -->
            <DsfrSideMenuListItem
              v-if="false"
            >
              <DsfrSideMenuLink
                data-testid="menuEnvironments"
                :active="routeName === 'Environments'"
                :to="`/projects/${selectedProject?.id}/environments`"
              >
                Environments du projet
              </DsfrSideMenuLink>
            </DsfrSideMenuListItem>
          </div>
        </DsfrSideMenuList>
      </DsfrSideMenuListItem>
      <DsfrSideMenuButton
        data-testid="menuDocBtn"
        :expanded="isExpanded.doc"
        button-label="Documentation"
        control-id="docList"
        @toggle-expand="toggleExpand('doc')"
      >
        Documentation
      </DsfrSideMenuButton>
      <DsfrSideMenuList
        id="docList"
        data-testid="menuDocList"
        :expanded="isExpanded.doc"
        :collapsable="true"
      >
        <DsfrSideMenuListItem>
          <DsfrSideMenuLink
            data-testid="menuDocIntroduction"
            :active="routeName === 'DocIntroduction'"
            to="/doc/introduction"
          >
            Introduction
          </DsfrSideMenuLink>
          <DsfrSideMenuLink
            data-testid="menuDocPrerequisites"
            :active="routeName === 'DocPrerequisites'"
            to="/doc/prerequisites"
          >
            Prérequis
          </DsfrSideMenuLink>
          <DsfrSideMenuLink
            data-testid="menuDocProjects"
            :active="routeName === 'DocProjects'"
            to="/doc/projects"
          >
            Projets
          </DsfrSideMenuLink>
          <DsfrSideMenuLink
            data-testid="menuDocTutorials"
            :active="routeName === 'DocTutorials'"
            to="/doc/tutorials"
          >
            Tutoriels
          </DsfrSideMenuLink>
          <DsfrSideMenuLink
            data-testid="menuDocUtils"
            :active="routeName === 'DocUtils'"
            to="/doc/utils"
          >
            Liens utiles
          </DsfrSideMenuLink>
        </DsfrSideMenuListItem>
      </DsfrSideMenuList>
    </Dsfrsidemenulist>
  </DsfrSideMenu>
</template>
