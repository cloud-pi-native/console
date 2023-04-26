<script setup>
import { ref, computed } from 'vue'
import { useProjectStore } from '@/stores/project.js'
import { useUserStore } from '@/stores/user.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { descriptionMaxLength } from 'shared/src/schemas/project.js'
import DsoSelectedProject from './DsoSelectedProject.vue'
import router from '@/router/index.js'

const projectStore = useProjectStore()
const userStore = useUserStore()
const snackbarStore = useSnackbarStore()

const project = computed(() => projectStore.selectedProject)
const owner = computed(() => projectStore.selectedProjectOwner)
const isOwner = computed(() => owner?.value?.id === userStore.userProfile.id)

const description = ref(project.value.description)
const isEditingDescription = ref(false)
const isArchivingProject = ref(false)
const projectToArchive = ref('')

const updateProject = async (projectId) => {
  try {
    await projectStore.updateProject(projectId, { description: description.value })
    isEditingDescription.value = false
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
  }
}

const archiveProject = async (projectId) => {
  try {
    await projectStore.archiveProject(projectId)
    router.push('/projects')
  } catch (error) {
    snackbarStore.setMessage(error?.message, 'error')
  }
}

</script>

<template>
  <DsoSelectedProject />
  <div
    class="fr-callout fr-my-8w"
  >
    <h3
      class="fr-callout__title fr-mb-3w"
    >
      {{ project.name }}
    </h3>
    <div
      v-if="!isEditingDescription"
      class="flex gap-4 items-center"
    >
      <p
        v-if="project.description"
        data-testid="descriptionP"
      >
        {{ project.description }}
      </p>
      <DsfrButton
        class="fr-mt-0"
        icon="ri-pencil-fill"
        data-testid="setDescriptionBtn"
        :title="project.description ? 'Editer la description' : 'Ajouter une description'"
        label="Ajouter une description"
        :icon-only="!!project.description"
        secondary
        @click="isEditingDescription = true"
      />
    </div>
    <div
      v-if="isEditingDescription"
    >
      <DsfrInput
        v-model="description"
        data-testid="descriptionInput"
        :is-textarea="true"
        :maxlength="descriptionMaxLength"
        label="Description du projet"
        label-visible
        :hint="`Courte description expliquant la finalité du projet (${descriptionMaxLength} caractères maximum).`"
        placeholder="Application de réservation de places à l'examen du permis B."
      />
      <div
        class="flex justify-between"
      >
        <DsfrButton
          data-testid="saveDescriptionBtn"
          label="Enregistrer la description"
          secondary
          icon="ri-send-plane-line"
          @click="updateProject(project.id)"
        />
        <DsfrButton
          label="Annuler"
          primary
          @click="isEditingDescription = false"
        />
      </div>
    </div>
    <div
      class="flex justify-between fr-mt-2w"
    >
      <DsfrBadge
        v-if="projectStore.selectedProject?.status === 'initializing'"
        :data-testid="`${projectStore.selectedProject?.status}-badge`"
        type="info"
        label="Projet en cours de création"
      />
      <DsfrBadge
        v-else-if="projectStore.selectedProject?.status === 'failed'"
        :data-testid="`${projectStore.selectedProject?.status}-badge`"
        type="error"
        label="Echec des opérations"
      />
      <DsfrBadge
        v-else
        :data-testid="`${projectStore.selectedProject?.status}-badge`"
        type="success"
        label="Projet correctement déployé"
      />
      <DsfrBadge
        v-if="projectStore.selectedProject?.locked"
        data-testid="locked-badge"
        type="warning"
        label="Projet verrouillé : opérations en cours"
      />
    </div>
  </div>
  <div
    v-if="isOwner"
    data-testid="archiveProjectZone"
    class="fr-my-2w fr-py-4w fr-px-1w border-solid border-1 rounded-sm border-red-500"
  >
    <div class="flex justify-between items-center <md:flex-col">
      <DsfrButton
        v-show="!isArchivingProject"
        data-testid="showArchiveProjectBtn"
        :label="`Archiver le projet ${project?.name}`"
        :disabled="projectStore.selectedProject?.locked"
        primary
        icon="ri-delete-bin-7-line"
        @click="isArchivingProject = true"
      />
      <DsfrAlert
        class="<md:mt-2"
        description="L'archivage du projet est irréversible."
        type="warning"
        small
      />
    </div>
    <div
      v-if="isArchivingProject"
      class="fr-mt-4w"
    >
      <DsfrInput
        v-model="projectToArchive"
        data-testid="archiveProjectInput"
        :label="`Veuillez taper '${project?.name}' pour confirmer l'archivage du projet`"
        label-visible
        :placeholder="project?.name"
        class="fr-mb-2w"
      />
      <div
        class="flex justify-between"
      >
        <DsfrButton
          data-testid="archiveProjectBtn"
          :label="`Archiver définitivement le projet ${project?.name}`"
          :disabled="projectToArchive !== project?.name"
          secondary
          icon="ri-delete-bin-7-line"
          @click="archiveProject(project.id)"
        />
        <DsfrButton
          label="Annuler"
          primary
          @click="isArchivingProject = false"
        />
      </div>
    </div>
  </div>
</template>
