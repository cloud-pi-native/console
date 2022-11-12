<script setup>
import SideMenu from './components/SideMenu.vue'
import { ref, onMounted, watch } from 'vue'
import { useUserStore } from './stores/user.js'
import { getKeycloak } from './utils/keycloak/init.js'

const keycloak = getKeycloak()
const userStore = useUserStore()
userStore.setIsLoggedIn()

const isLoggedIn = ref(keycloak.authenticated)
const label = ref(isLoggedIn.value ? 'Se déconnecter' : 'Se connecter')
const to = ref(isLoggedIn.value ? '/logout' : '/login')

const quickLinks = ref([{
  label,
  to,
  icon: 'ri-account-circle-line',
  iconRight: true,
}])

onMounted(() => {
  if (isLoggedIn.value) userStore.setUserProfile()
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
  <div class="fr-container fr-grid-row">
    <div class="fr-col-12 fr-col-md-3">
      <SideMenu />
    </div>
    <div class="fr-col-12 fr-col-md-9 fr-py-6v">
      <router-view />
    </div>
  </div>
</template>
