<script setup lang="ts">
import SideMenu from './components/SideMenu.vue'
import DsoSnackbar from './components/DsoSnackbar.vue'
import { ref, onMounted, watch, onBeforeMount, type Ref } from 'vue'
import { getKeycloak } from './utils/keycloak/keycloak'
import { useUserStore } from './stores/user.js'
import { useProjectStore } from './stores/project.js'

const keycloak = getKeycloak()
const userStore = useUserStore()
const projectStore = useProjectStore()

userStore.setIsLoggedIn()

const isLoggedIn = ref(keycloak.authenticated)
const label = ref(isLoggedIn.value ? 'Se déconnecter' : 'Se connecter')
const to = ref(isLoggedIn.value ? '/logout' : '/login')
const intervalId: Ref<number | undefined> = ref(undefined)
const appVersion = process.env.APP_VERSION ? `v${process.env.APP_VERSION}` : 'v-dev'

const quickLinks = ref([{
  label,
  to,
  icon: 'ri-account-circle-line',
  iconRight: true,
}])

const refreshProjects = () => {
  intervalId.value = window.setInterval(async () => {
    await projectStore.getUserProjects()
  }, 30_000)
}

onBeforeMount(() => {
  clearInterval(intervalId.value)
})

onMounted(() => {
  if (isLoggedIn.value) {
    userStore.setUserProfile()
    refreshProjects()
  }
})

watch(label, (label) => {
  quickLinks.value[0].label = label
})

</script>

<template>
  <DsfrHeader
    service-title="Console Cloud π Native"
    :logo-text="['Ministère', 'de l’intérieur', 'et des outre-mer']"
    :quick-links="quickLinks"
  />
  <div class="fr-container fr-grid-row fr-mb-8w">
    <div class="fr-col-12 fr-col-md-3">
      <SideMenu />
    </div>
    <div class="fr-col-12 fr-col-md-9 fr-py-6v">
      <router-view />
    </div>
    <DsoSnackbar />
  </div>

  <DsfrFooter
    class="dso-footer"
    a11y-compliance="partiellement conforme"
    :logo-text="['Ministère', 'de l’Intérieur', 'et des Outre-Mer']"
    mandatory-links="[]"
  >
    <template #description>
      <a
        :href="`https://github.com/cloud-pi-native/console/releases/tag/${appVersion}`"
      >
        {{ appVersion }}
      </a>
    </template>
  </DsfrFooter>
</template>
