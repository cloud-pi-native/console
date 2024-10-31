<script lang="ts" setup>
import type { ProjectV2 } from '@cpn-console/shared'
import { useProjectStore } from '../../stores/project.js'
import type { Project } from '@/utils/project-utils.js'

const props = defineProps<{ projectSlug: ProjectV2['slug'] }>()

const projectStore = useProjectStore()

const project = ref<Project | undefined>(undefined)

watch(projectStore.projectsBySlug, (store) => {
  project.value = store[props.projectSlug]
}, { immediate: true })
</script>

<template>
  <div
    class="fr-col-12 pr-5 pl-2 overflow-x-hidden"
  >
    <router-view />
    <ProjectLogsViewer
      :key="project?.id"
      :project-slug="projectSlug"
    />
    <OperationPanel
      :project-slug="projectSlug"
    />
  </div>
</template>
