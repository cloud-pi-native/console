<script lang="ts" setup>
import { computed } from 'vue'
import { useProjectStore } from '@/stores/project.js'
import DsoSelectedProject from './DsoSelectedProject.vue'

const projectStore = useProjectStore()

// @ts-ignore
const projectServices = Object.values(computed(() => projectStore.selectedProject?.services).value)
// @ts-ignore
  .map(value => ({ ...value, id: value?.name }))

</script>

<template>
  <DsoSelectedProject />
  <DsfrTiles
    :tiles="projectServices"
    data-testid="projectTiles"
    class="fr-mt-2v"
  />
</template>
