<script setup>
import { onMounted } from 'vue'
import { useUserStore } from '../stores/user.js'

const userStore = useUserStore()

onMounted(() => {
  userStore.setIsLoggedIn()
})

</script>

<template>
  <h1
    class="fr-h1"
  >
    Accueil
  </h1>
</template>
