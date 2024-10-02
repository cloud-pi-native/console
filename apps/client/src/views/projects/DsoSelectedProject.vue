<script lang="ts" setup>
import type { ProjectComplete } from '@/stores/project.js'
import { useProjectStore } from '@/stores/project.js'

const props = defineProps<{ projectId: ProjectComplete['id'] }>()

const projectStore = useProjectStore()
const project = computed(() => projectStore.myProjectsById[props.projectId])
</script>

<template>
  <DsfrAlert
    v-show="project"
    :type="project.locked ? 'warning' : 'info'"
    :description="`Le projet ${project.name} est verrouillé. Veuillez contacter un administrateur`"
    data-testid="currentProjectInfo"
    small
    class="w-max fr-mb-2w lg:hidden"
  />
</template>
