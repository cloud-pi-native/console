<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSnackbarStore } from '@/stores/snackbar.js'

const route = useRoute()
const snackbarStore = useSnackbarStore()

const routePath = computed(() => route.path)
const message = computed(() => snackbarStore.message)
const isOpen = computed(() => snackbarStore.isOpen)
const type = computed(() => snackbarStore.type)

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
      :description="message"
      :type="type"
      :closed="!isOpen"
      class="fixed bg-white bottom-4"
      small
      closeable
      @close="closeSnackbar()"
    />
  </div>
</template>
