<script lang="ts" setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSnackbarStore } from '@/stores/snackbar'

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
  <div>
    <DsfrAlert
      data-testid="snackbar"
      :type="type"
      :closed="!isOpen"
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
  </div>
</template>

<style scoped>
.dso-snackbar {
  @apply fixed bottom-4 z-1000 mx-4;

  background-color: var(--background-default-grey);
}
</style>
