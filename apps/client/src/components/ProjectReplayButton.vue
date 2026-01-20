<script lang="ts" setup>
import type { Project, ProjectOperations } from '@/utils/project-utils.js'
import { useSnackbarStore } from '@/stores/snackbar.js'

const props = defineProps<{
  project: Project
}>()

const snackbarStore = useSnackbarStore()
const isReplaying = computed(
  () =>
    !!(
      props.project.operationsInProgress as unknown as ProjectOperations[]
    ).find(ope => ope.startsWith('update')),
)
const isDeleting = computed(
  () =>
    !!(
      props.project.operationsInProgress as unknown as ProjectOperations[]
    ).find(ope => ope.startsWith('delete')),
)

async function replayHooks() {
  await props.project.Commands.replay()
  switch (props.project.status) {
    case 'created':
      snackbarStore.setMessage(
        'Le projet a été reprovisionné avec succès.',
        'success',
      )
      break
    case 'failed':
      snackbarStore.setMessage(
        'Le projet a été reprovisionné mais a rencontré une erreur bloquante.\nVeuillez consulter les journaux puis réessayer dans quelques instants.\nSi le problème persiste, vous pouvez contacter un administrateur.',
        'error',
      )
      break
    case 'warning':
      snackbarStore.setMessage(
        'Le projet a été reprovisionné et a rencontré une erreur non bloquante.\nVeuillez consulter les journaux puis réessayer dans quelques instants.\nSi le problème persiste, vous pouvez contacter un administrateur.',
        'warning',
        20_000,
      )
      break
    default:
      snackbarStore.setMessage(
        'Le projet a été reprovisionné mais se trouve dans un état inconnu.',
        'info',
      )
      break
  }
}
</script>

<template>
  <DsfrButton
    data-testid="replayHooksBtn"
    label="Reprovisionner le projet"
    :icon="{
      name: 'ri:refresh-line',
      animation: isReplaying ? 'spin' : undefined,
    }"
    :disabled="project.locked || isReplaying || isDeleting"
    @click="replayHooks"
  />
</template>
