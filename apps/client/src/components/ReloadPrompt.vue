<script setup lang="ts">
// @ts-ignore
import { useRegisterSW } from 'virtual:pwa-register/vue'

const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW()

async function close() {
  offlineReady.value = false
  needRefresh.value = false
}
</script>

<template>
  <div
    v-if="offlineReady || needRefresh"
    class="w-full flex justify-center"
  >
    <DsfrAlert
      data-testid="snackbar"
      type="info"
      class="dso-snackbar max-w-300"
      small
      :closed="false"
      closeable
      @close="close()"
    >
      <span v-if="offlineReady">
        App ready to work offline
      </span>
      <span v-else>
        Une nouvelle version de l'application est disponible.
      </span>
      <DsfrButton v-if="needRefresh" @click="updateServiceWorker()">
        Mettre à jour
      </DsfrButton>
    </DsfrAlert>
  </div>
</template>

<style scoped>
.dso-snackbar {
  @apply fixed bottom-4 z-1 mx-4;

  background-color: var(--background-default-grey);
}
</style>
