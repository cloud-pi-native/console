<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  visuallyHidden?: boolean
}>(), {
  visuallyHidden: false,
})
</script>

<template>
  <h1 :class="visuallyHidden ? 'fr-sr-only' : 'fr-h3'">
    {{ title }}
  </h1>
</template>
