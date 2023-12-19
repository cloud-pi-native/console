<script lang="ts" setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSnackbarStore } from '@/stores/snackbar.js'

const route = useRoute()
const snackbarStore = useSnackbarStore()
const routePath = computed(() => route.path)

watch(routePath, () => {
  snackbarStore.clearMessages()
})
</script>

<template>
  <div
    class="flex justify-left dso-snackbar"
  >
    <DsfrAlert
      v-for="message in Object.values(snackbarStore.messages)"
      :key="message.timestamp"
      data-testid="snackbar"
      :description="message.text.slice(0, 1000)"
      :type="message.type"
      :class="message.isDisplayed ? 'dso-snackbar-message' : 'dso-snackbar-message-hidden'"
      small
      closeable
      @click="snackbarStore.hide(message)"
    />
  </div>
</template>

<style scoped>
@keyframes swipe {
  100% { left: -300%;
  display: none; }

  0% { left: 0;
  display: block; }
}

.dso-snackbar {
  display: grid;
  grid-column: auto;
  row-gap: 1px;

  @apply w-full fixed bottom-4 z-1;

  pointer-events: none;
}

.dso-snackbar-message {
  @apply z-1;

  margin-top: 0.5rem;
  position: relative;
  background-color: var(--background-default-grey);
  pointer-events: all;
}

.dso-snackbar-message-hidden {
  @apply z-1;

  animation: swipe 1s;
  margin-top: 0.5rem;
  position: relative;
  z-index: -2;
  background-color: var(--background-default-grey);
}
</style>
