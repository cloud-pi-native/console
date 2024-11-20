<script lang="ts" setup>
import type { ProjectV2 } from '@cpn-console/shared'
import { useProjectStore } from '../../stores/project.js'
import type { Project } from '@/utils/project-utils.js'

const props = defineProps<{ projectId: ProjectV2['id'] }>()

const projectStore = useProjectStore()

const project = ref<Project | undefined>(undefined)

watch(projectStore.projectsById, (store) => {
  console.log({ store })

  project.value = store[props.projectId]
}, { immediate: true })
</script>

<template>
  <div
    class="fr-col-12 pr-5 pl-2 overflow-x-hidden"
  >
    <router-view />
    <ProjectLogsViewer
      :key="projectId"
      :project-id="projectId"
    />
    <OperationPanel
      :project-id="projectId"
    />
  </div>
</template>
