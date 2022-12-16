<script setup>
import { useProjectStore } from '@/stores/project.js'

const projectStore = useProjectStore()
</script>

<template>
  <DsfrAlert
    v-if="projectStore.selectedProject"
    type="info"
    :description="`Le projet courant est : ${projectStore.selectedProject?.projectName}`"
    data-testid="currentProjectInfo"
    small
    class="fr-mb-2w"
  />
</template>
