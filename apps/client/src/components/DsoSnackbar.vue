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
  <DsfrAlert
    :title="type === 'error' ? 'Erreur' : 'Info'"
    :description="message"
    :type="type"
    :closed="!isOpen"
    closeable
    @close="closeSnackbar()"
  />
  <!-- <transition name="bounce">
    <div
      v-show="show"
      class="snackbar"
    >
      <DsfrAlert
        class="shadow-md  m-0"
        :class="type"
        :type="type"
        small
        data-testid="snackbar"
        :description="message"
        :closeable="type ==='error'"
        @close="closeSnackbar()"
      />
    </div>
  </transition> -->
</template>

<!-- <style scoped>
.snackbar {
  @apply flex  space-x-4  bg-white  text-sm  font-bold  px-4  py-3  my-8  fixed  bottom-0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1050;
}
.bounce-enter-active,
.snackbar-leave-active {
  transition: all 0.2s ease-in-out;
}
.bounce-enter,
.bounce-leave-to {
  opacity: 0;
  transition: all 0.3s ease-in-out;
}
</style> -->
