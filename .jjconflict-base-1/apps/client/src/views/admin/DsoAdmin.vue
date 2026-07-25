<script lang="ts" setup>
import router from '@/router/index.js'
import { useUserStore } from '@/stores/user.js'

onMounted(() => {
  if (useUserStore().adminPerms === 0n) {
    router.push('/')
  }
})
</script>

<template>
  <router-view />
</template>
