<script lang="ts" setup>
import { useProjectStore } from '@/stores/project.js'

const projectStore = useProjectStore()
</script>

<template>
  <DsfrAlert
    v-if="projectStore.selectedProject"
    :type="projectStore.selectedProject.locked ? 'warning' : 'info'"
    :description="projectStore.selectedProject.locked ? `Le projet ${projectStore.selectedProject?.name} est verrouillé. Veuillez contacter un administrateur` : `Le projet courant est : ${projectStore.selectedProject?.name} (${projectStore.selectedProject?.organization?.label})`"
    data-testid="currentProjectInfo"
    small
    class="w-max fr-mb-2w"
  />
</template>
