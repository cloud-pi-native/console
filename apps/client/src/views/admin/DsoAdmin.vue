<script lang="ts" setup>
import router from '@/router/index'
import { useUserStore } from '@/stores/user'

onMounted(() => {
  if (useUserStore().adminPerms === 0n) {
    router.push('/')
  }
})
</script>

<template>
  <router-view />
</template>
