<script lang="ts" setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSnackbarStore } from '@/stores/snackbar.js'

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
  <!--
    The live region is always mounted: assistive technologies only announce
    content inserted into an existing region, not a region that appears with
    its content.
  -->
  <output
    class="block"
    :role="type === 'error' ? 'alert' : 'status'"
    :aria-live="type === 'error' ? 'assertive' : 'polite'"
    aria-atomic="true"
    data-testid="snackbar-region"
  >
    <DsfrAlert
      v-if="isOpen"
      data-testid="snackbar"
      :type="type"
      class="dso-snackbar max-w-300"
      small
      closeable
      @close="closeSnackbar()"
    >
      <span
        style="white-space: pre-wrap;"
      >
        {{ message }}
      </span>
    </DsfrAlert>
  </output>
</template>

<style scoped>
.dso-snackbar {
  @apply fixed bottom-4 z-1000 mx-4;

  background-color: var(--background-default-grey);
}
</style>
