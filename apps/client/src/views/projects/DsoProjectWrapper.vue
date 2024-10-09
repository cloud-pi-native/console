<script lang="ts" setup>
import { useProjectStore } from '../../stores/project.js'
import { isInProject } from '../../router/index.js'

const projectStore = useProjectStore()
</script>

<template>
  <div
    class="fr-col-12 pr-5 overflow-x-hidden"
  >
    <router-view />
    <ProjectLogsViewer
      v-if="projectStore.selectedProject && projectStore.selectedProjectPerms && isInProject"
      :project-id="projectStore.selectedProject.id"
    />
  </div>
</template>
