<script setup lang="ts">
const _props = defineProps<{
  name: string
  type: 'cluster' | 'zone' | 'project'
}>()

const iconTypeMapper: Record<typeof _props['type'], string> = {
  cluster: 'ri:server-line',
  zone: 'ri:focus-3-line',
  project: 'ri:folder-line',
}
</script>

<template>
  <div
    class="p-1 badge rounded-sm shadow"
  >
    <v-icon :name="iconTypeMapper[type]" />
    {{ name }}
  </div>
</template>

<style scoped>
.badge{
  background-color: var(--background-alt-grey);
}
</style>
