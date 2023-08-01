<script lang="ts" setup>
/** Must be contained in a relative parent */

withDefaults(defineProps<{
  showLoader: boolean
  description: string
}>(), {
  description: 'Veuillez patienter',
})
</script>

<template>
  <div
    v-show="showLoader"
    class="absolute  top-0  bottom-0  left-0  right-0  bg-dark  opacity-80 blur"
  />
  <div
    v-show="showLoader"
    class="z-1 absolute  top-0  bottom-0  left-0  right-0  flex  justify-center  items-center gap-2 backdrop-blur-2"
  >
    <div>
      <v-icon
        name="ri-loader-4-line"
        fill="var(--info-425-625)"
        animation="spin"
      />
    </div>
    <span>
      {{ description }}
    </span>
  </div>
</template>
