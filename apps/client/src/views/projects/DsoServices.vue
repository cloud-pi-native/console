<script setup>
import { computed } from 'vue'
import { useProjectStore } from '@/stores/project.js'
import DsoSelectedProject from './DsoSelectedProject.vue'

const projectStore = useProjectStore()

/**
 * @returns {string}
 */
const projectServices = computed(() => projectStore.selectedProject?.services
  .map(service => ({
    ...service,
    id: service.name,
  }),
  ))

</script>

<template>
  <DsoSelectedProject />
  <DsfrTiles
    :tiles="projectServices"
    data-testid="projectTiles"
    class="fr-mt-2v"
  />
</template>
