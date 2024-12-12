<script setup lang="ts">
import { swaggerUiPath } from '@cpn-console/shared'
</script>

<template>
  <iframe
    :src="swaggerUiPath"
    class="w-full h-full"
    title="Swagger Frame"
  />
</template>
