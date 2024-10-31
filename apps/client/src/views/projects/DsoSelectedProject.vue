<script lang="ts" setup>
import type { ProjectV2 } from '@cpn-console/shared'
import { useProjectStore } from '@/stores/project.js'

const props = defineProps<{ projectSlug: ProjectV2['id'] }>()

const projectStore = useProjectStore()
const project = computed(() => projectStore.projectsBySlug[props.projectSlug])
</script>

<template>
  <div
    class="w-full flex flex-row flex-wrap space-between"
  >
    <div
      class="grow"
    >
      <DsfrAlert
        v-if="project"
        :type="project.locked ? 'warning' : 'info'"
        :description="project.locked ? `Le projet ${project?.name} (${project?.slug}) est verrouillé. Veuillez contacter un administrateur` : `Le projet courant est : ${project?.name} (${project?.slug})`"
        data-testid="currentProjectInfo"
        small
        class="w-max fr-mb-2w"
      />
    </div>
    <slot />
  </div>
</template>
