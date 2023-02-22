<script setup>
import SideMenu from './components/SideMenu.vue'
import { ref, onMounted, watch, onBeforeMount } from 'vue'
import { getKeycloak } from './utils/keycloak/keycloak.js'
import { useUserStore } from './stores/user.js'
import { useProjectStore } from './stores/project.js'

const keycloak = getKeycloak()
const userStore = useUserStore()
const projectStore = useProjectStore()

userStore.setIsLoggedIn()

const isLoggedIn = ref(keycloak.authenticated)
const label = ref(isLoggedIn.value ? 'Se déconnecter' : 'Se connecter')
const to = ref(isLoggedIn.value ? '/logout' : '/login')
const intervalId = ref(undefined)

const quickLinks = ref([{
  label,
  to,
  icon: 'ri-account-circle-line',
  iconRight: true,
}])

const closed = ref(false)
const close = () => {
  closed.value = !closed.value
}

const refreshProjects = () => {
  intervalId.value = setInterval(async () => {
    await projectStore.getUserProjects()
  }, 60_000)
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
  quickLinks.value.label = label
})

</script>

<template>
  <DsfrHeader
    service-title="Console Cloud PI Native"
    :logo-text="['Ministère', 'de l’intérieur']"
    :quick-links="quickLinks"
  />
  <div class="fr-container fr-grid-row fr-mb-8w">
    <div class="fr-col-12 fr-col-md-3">
      <SideMenu />
    </div>
    <div class="fr-col-12 fr-col-md-9 fr-py-6v">
      <router-view />
    </div>
    <DsfrAlert
      v-if="isLoggedIn"
      data-testid="whoamiSnackbar"
      class="snackbar"
      :description="`Vous êtes connecté(e) en tant que ${userStore.userProfile.firstName} ${userStore.userProfile.lastName}`"
      type="info"
      small
      :closed="closed"
      closeable
      @close="close()"
    />
  </div>
</template>
