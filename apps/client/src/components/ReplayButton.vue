<script lang="ts" setup>
import { ProjectAuthorized } from '@cpn-console/shared'
import { useProjectStore } from '@/stores/project.js'
import type { Project } from '@/utils/project-utils.js'
import { useSnackbarStore } from '@/stores/snackbar.js'

const props = defineProps<{
  projectSlug: Project['slug']
}>()

const snackbarStore = useSnackbarStore()
const projectStore = useProjectStore()
const project = computed(() => projectStore.projectsBySlug[props.projectSlug])
const operationsInProgress = computed(() => project.value.operationsInProgress)

async function replayHooks() {
  await project.value.Commands.replay()
  switch (project.value.status) {
    case 'created':
      snackbarStore.setMessage('Le projet a été reprovisionné avec succès.', 'success')
      break
    case 'failed':
      snackbarStore.setMessage('Le projet a été reprovisionné mais a rencontré une erreur bloquante.\nVeuillez consulter les journaux puis réessayer dans quelques instants.\nSi le problème persiste, vous pouvez contacter un administrateur.', 'error')
      break
    case 'warning':
      snackbarStore.setMessage('Le projet a été reprovisionné et a rencontré une erreur non bloquante.\nVeuillez consulter les journaux puis réessayer dans quelques instants.\nSi le problème persiste, vous pouvez contacter un administrateur.', 'warning', 20_000)
      break
    default:
      snackbarStore.setMessage('Le projet a été reprovisionné mais se trouve dans un état inconnu.', 'info')
      break
  }
}
</script>

<template>
  <div
    v-if="ProjectAuthorized.ReplayHooks({ projectPermissions: project.myPerms })"
    class="fr-mt-2w"
  >
    <DsfrButton
      data-testid="replayHooksBtn"
      label="Reprovisionner le projet"
      :icon="{ name: 'ri:refresh-line', animation: operationsInProgress.includes('replay') ? 'spin' : '' }"
      secondary
      :disabled="project.locked || operationsInProgress.includes('replay')"
      @click="replayHooks"
    />
  </div>
</template>
