<script setup>
import { computed } from 'vue'
import { useProjectStore } from '@/stores/project.js'
import DsoSelectedProject from './DsoSelectedProject.vue'

const projectStore = useProjectStore()

/**
 * @returns {string}
 */
const projectServices = Object.entries(computed(() => projectStore.selectedProject?.services).value)
  .map(([key, value]) => [key, { ...value, id: value?.name }])
  .reduce((acc, [key, value]) => {
    acc[key] = value
    return acc
  }, {})

</script>

<template>
  <DsoSelectedProject />
  <DsfrTiles
    :tiles="projectServices"
    data-testid="projectTiles"
    class="fr-mt-2v"
  />
</template>
