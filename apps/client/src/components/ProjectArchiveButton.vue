<script lang="ts" setup>
import { useProjectStore } from '@/stores/project.js'
import type { Project } from '@/utils/project-utils.js'
import { deleteValidationInput } from '@cpn-console/shared'

const props = defineProps<{
  project: Project
}>()

const emit = defineEmits<{
  archive: []
}>()

const isArchivingProject = ref(false)
const deleteInput = ref('')
const isDeleting = computed(() => !!props.project.operationsInProgress.find(ope => ope.startsWith('delete')))

async function archiveProject() {
  isArchivingProject.value = false
  await props.project.Commands.delete()
  useProjectStore().lastSelectedProjectId = undefined
  emit('archive')
}
</script>

<template>
  <DsfrButton
    data-testid="showArchiveProjectBtn"
    label="Supprimer le projet"
    :disabled="isDeleting || project.locked"
    :icon="isDeleting
      ? { name: 'ri:refresh-line', animation: 'spin' }
      : 'ri:delete-bin-7-line'"
    @click="isArchivingProject = true"
  />
  <DsfrModal
    v-model:opened="isArchivingProject"
    title="Confirmer la suppression du projet"
    :is-alert="true"
    @close="isArchivingProject = false"
  >
    <DsfrInput
      v-model="deleteInput"
      data-testid="archiveProjectInput"
      :label="`Veuillez taper '${deleteValidationInput}' pour confirmer la suppression du projet`"
      label-visible
      :placeholder="deleteValidationInput"
      class="fr-mb-2w"
    />
    <DsfrButton
      data-testid="confirmDeletionBtn"
      label="Supprimer"
      secondary
      :disabled="deleteInput !== deleteValidationInput"
      @click="archiveProject"
    />
  </DsfrModal>
</template>
