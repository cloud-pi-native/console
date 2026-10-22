<script lang="ts" setup>
import type { Project } from '@/utils/project-utils.js'
import { useProjectStore } from '@/stores/project.js'

const props = defineProps<{
  project: Project
}>()

const projectStore = useProjectStore()

async function handleProjectLocking() {
  await projectStore.updateProject(props.project.id, { locked: !props.project.locked })
}
</script>

<template>
  <DsfrButton
    data-testid="handleProjectLockingBtn"
    :label="`${project.locked ? 'Déverrouiller' : 'Verrouiller'} le projet`"
    :icon="
      project.operationsInProgress.includes(
        'lockHandling',
      )
        ? { name: 'ri:refresh-line', animation: 'spin' }
        : project.locked
          ? 'ri:lock-unlock-line'
          : 'ri:lock-line'
    "
    :disabled="
      project.operationsInProgress.includes('lockHandling')
        || project.status === 'archived'
    "
    @click="handleProjectLocking"
  />
</template>
