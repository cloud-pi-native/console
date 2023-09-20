<script lang="ts" setup>
import { computed, watch, type ComputedRef } from 'vue'
import { useRoute } from 'vue-router'
import { useSnackbarStore } from '@/stores/snackbar.js'

const route = useRoute()
const snackbarStore = useSnackbarStore()

const routePath: ComputedRef<string> = computed(() => route.path)
const message: ComputedRef<string> = computed(() => snackbarStore.message)
const isOpen: ComputedRef<boolean> = computed(() => snackbarStore.isOpen)
const type: ComputedRef<string> = computed(() => snackbarStore.type)

const closeSnackbar = () => {
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
  @apply fixed bottom-4 z-1;

  background-color: var(--background-default-grey);
}
</style>
