<script setup lang="ts">
withDefaults(defineProps<{
  cover?: boolean
}>(), { cover: false })
</script>

<template>
  <div
    data-testid="cpin-loader"
    :class="`flex items-center justify-center ${cover ? 'absolute top-0 bottom-0 left-0 right-0 bg-[#5555] bg-blend-luminosity' : ''}`"
  >
    <span class="text-xl">
      <v-icon
        name="ri:loader-4-line"
        animation="spin"
        scale="1.5"
      />
      Chargement...
    </span>
  </div>
</template>
