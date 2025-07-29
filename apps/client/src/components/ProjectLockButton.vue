<script lang="ts" setup>
import type { Project } from '@/utils/project-utils'

const props = defineProps<{
  project: Project
}>()

async function handleProjectLocking() {
  await props.project.Commands.update({ locked: !props.project.locked })
}
</script>

<template>
  <DsfrButton
    data-testid="handleProjectLockingBtn"
    :label="`${project.locked ? 'Déverrouiller' : 'Verrouiller'} le projet`"
    :icon="project.operationsInProgress.includes('lockHandling')
      ? { name: 'ri:refresh-line', animation: 'spin' }
      : project.locked ? 'ri:lock-unlock-line' : 'ri:lock-line'"
    :disabled="project.operationsInProgress.includes('lockHandling') || project.status === 'archived'"
    @click="handleProjectLocking"
  />
</template>
