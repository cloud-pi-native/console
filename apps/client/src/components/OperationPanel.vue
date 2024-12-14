<script lang="ts" setup>
import { useProjectStore } from '@/stores/project.js'
import type { Project } from '@/utils/project-utils.js'

const props = defineProps<{
  projectSlug: Project['slug'] | undefined
}>()

const projectStore = useProjectStore()
const project = computed<Project | undefined>(() => projectStore.projectsBySlug[props.projectSlug ?? ''])
</script>

<template>
  <div
    v-if="project?.operationsInProgress.length"
    class="fixed bottom-5 right-5 z-999 shadow-lg background-default-grey"
  >
    <DsfrAlert
      data-testid="operationInProgressAlert"
      title="Opération en cours..."
      :description="project?.operationsInProgress.length === 2 ? 'Une ou plusieurs tâches en attente' : ''"
      type="info"
    />
  </div>
</template>
