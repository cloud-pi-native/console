<script lang="ts" setup>
import { createApp } from '@/opencds/app.js'
import { getKeycloak } from '@/utils/keycloak/keycloak'

const response = ref('Loading SSR component…')
onUpdated(() => {
  createApp().mount('#opencds')
})

onMounted(async () => {
  response.value = await (
    await fetch('/api/v1/opencds', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${getKeycloak().token}`,
      },
    })
  ).text()
})
</script>

<template>
  <div v-html="response" />
</template>
