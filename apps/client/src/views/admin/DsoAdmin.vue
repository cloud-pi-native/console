<script lang="ts" setup>
import router from '@/router/index.ts'
import { useUserStore } from '@/stores/user.ts'

onMounted(() => {
  if (useUserStore().adminPerms === 0n) {
    router.push('/')
  }
})
</script>

<template>
  <router-view />
</template>
