<script setup>
import { onMounted } from 'vue'
import { useUserStore } from '../stores/user.js'
import Home from '@/documentation/home.md'

const userStore = useUserStore()

onMounted(() => {
  userStore.setIsLoggedIn()
})

</script>

<template>
  <Home />
</template>
