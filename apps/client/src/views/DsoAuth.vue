<template>
  <div v-if="!isLogin">
    <h1>Authentification</h1>
    <h2>...redirection en cours</h2>
  </div>
  <div>
    <DsfrButton
      :icon="icon"
      label="Déconnecter"
      primary
      @click="logout()"
    />
  </div>
</template>

<script setup>
import { logout as logoutKeycloack } from '@/utils/keycloak/init-sso.js'
import { useUserStore } from '@/stores/user.js'
import { computed } from 'vue'
const userStore = useUserStore()

const isLogin = computed(() => userStore.loggedIn)

const logout = async () => {
  await logoutKeycloack()
}
</script>
