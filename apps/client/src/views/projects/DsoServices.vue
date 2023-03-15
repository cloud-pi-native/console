<script setup>
import { computed } from 'vue'
import { useProjectStore } from '@/stores/project.js'
import DsoSelectedProject from './DsoSelectedProject.vue'

const projectStore = useProjectStore()

/**
 * @returns {string}
 */
const projectServices = computed(() => projectStore.selectedProject?.services)

</script>

<template>
  <DsoSelectedProject />
  <div
    class="fr-grid-row fr-grid-row--gutters"
  >
    <div
      v-for="projectService in projectServices"
      :key="projectService.id"
      class="fr-col-6 fr-col-md-4 fr-col-lg-3 fr-mb-2w"
    >
      <DsfrTile
        :data-testid="`${projectService.id}-tile`"
        :title="projectService.title"
        :description="projectService.description"
        :img-src="projectService.imgSrc"
        :to="projectService.to"
      />
      <DsfrBadge
        :data-testid="`${projectService.id}-${projectService.status}-badge`"
        :type="projectService.status"
        :label="projectService.status === 'success' ? 'OK' : 'KO'"
      />
    </div>
  </div>
</template>
