<script setup>
import { initKeycloak } from '@/utils/oidc/init-sso.js'
import { onMounted } from 'vue'

onMounted(async () => {
  await initKeycloak()
})
</script>

<template>
  <h1>Authentification</h1>
  <h2>...redirection en cours</h2>
</template>
