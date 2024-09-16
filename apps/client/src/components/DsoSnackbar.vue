<script lang="ts" setup>
import { useSnackbarStore } from '@/stores/snackbar.js'
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const snackbarStore = useSnackbarStore()

const routePath = computed(() => route.path)
const message = computed(() => snackbarStore.message)
const isOpen = computed(() => snackbarStore.isOpen)
const type = computed(() => snackbarStore.type)

function closeSnackbar() {
  snackbarStore.hideMessage()
}

watch(routePath, () => {
  closeSnackbar()
})
</script>

<template>
  <div class="w-full flex justify-center">
    <DsfrAlert
      data-testid="snackbar"
      :description="message"
      :type="type"
      :closed="!isOpen"
      class="dso-snackbar"
      small
      closeable
      @close="closeSnackbar()"
    />
  </div>
</template>

<style scoped>
.dso-snackbar {
  @apply fixed bottom-4 z-1 mx-4;

  background-color: var(--background-default-grey);
}
</style>
