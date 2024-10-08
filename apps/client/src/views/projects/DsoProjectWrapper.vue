<script lang="ts" setup>
import { ProjectAuthorized } from '@cpn-console/shared'
import { useProjectStore } from '../../stores/project.js'

const projectStore = useProjectStore()
</script>

<template>
  <div
    class="fr-col-12 pr-5 overflow-x-hidden"
  >
    <router-view />
    <ProjectLogsViewer
      v-if="projectStore.selectedProject && ProjectAuthorized.Manage({ projectPermissions: projectStore.selectedProjectPerms })"
      :project-id="projectStore.selectedProject.id"
    />
  </div>
</template>
