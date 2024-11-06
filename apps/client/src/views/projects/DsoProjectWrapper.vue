<script lang="ts" setup>
import type { ProjectV2 } from '@cpn-console/shared'
import { useProjectStore } from '../../stores/project.js'
import { isInProject } from '../../router/index.js'

const props = defineProps<{ projectId: ProjectV2['id'] }>()

const projectStore = useProjectStore()
const project = computed(() => projectStore.projectsById[props.projectId])
</script>

<template>
  <div
    class="fr-col-12 pr-5 pl-2 overflow-x-hidden"
  >
    <router-view />
    <ProjectLogsViewer
      v-if="isInProject"
      :project-id="project.id"
    />
    <div
      v-if="project?.operationsInProgress.size"
      class="fixed bottom-5 right-5 z-999 shadow-lg background-default-grey"
    >
      <DsfrAlert
        data-testid="operationInProgressAlert"
        title="Opération en cours..."
        :description="project.operationsInProgress.size === 2 ? 'Une ou plusieurs tâches en attente' : ''"
        type="info"
      />
    </div>
  </div>
</template>
