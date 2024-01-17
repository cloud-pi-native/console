<script lang="ts" setup>
import { computed } from 'vue'
import { useProjectStore } from '@/stores/project.js'

const projectStore = useProjectStore()

// @ts-ignore
const projectServices = computed(() => projectStore.selectedProject.externalServices.map(value => ({ ...value, id: value?.title })))

</script>

<template>
  <DsoSelectedProject />
  <DsfrTiles
    :tiles="projectServices"
    data-testid="projectTiles"
    class="fr-mt-2v"
  />
</template>
