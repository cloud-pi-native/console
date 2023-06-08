<script setup>
import { ref, computed } from 'vue'
import { useProjectStore } from '@/stores/project.js'
import { useUserStore } from '@/stores/user.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { descriptionMaxLength, projectIsLockedInfo } from 'shared'
import DsoSelectedProject from './DsoSelectedProject.vue'
import DsoBadge from '@/components/DsoBadge.vue'
import router from '@/router/index.js'

const projectStore = useProjectStore()
const userStore = useUserStore()
const snackbarStore = useSnackbarStore()

const project = computed(() => projectStore.selectedProject)
const owner = computed(() => projectStore.selectedProjectOwner)
const isOwner = computed(() => owner?.value?.id === userStore.userProfile.id)

const description = ref(project?.value.description)
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

const getDynamicTitle = (locked, description) => {
  if (locked) return projectIsLockedInfo
  if (description) return 'Editer la description'
  return 'Ajouter une description'
}
</script>

<template>
  <DsoSelectedProject />
  <div
    class="fr-callout fr-my-8w"
  >
    <h1
      class="fr-callout__title fr-mb-3w"
    >
      {{ project?.name }}
    </h1>
    <div
      v-if="!isEditingDescription"
      class="flex gap-4 items-center"
    >
      <p
        v-if="project?.description"
        data-testid="descriptionP"
      >
        {{ project?.description }}
      </p>
      <DsfrButton
        class="fr-mt-0"
        icon="ri-pencil-fill"
        data-testid="setDescriptionBtn"
        :title="getDynamicTitle(project?.locked, project?.description)"
        :disabled="project?.locked"
        :icon-only="!!project?.description"
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
          @click="updateProject(project?.id)"
        />
        <DsfrButton
          label="Annuler"
          primary
          @click="isEditingDescription = false"
        />
      </div>
    </div>
  </div>
  <div>
    <div
      class="flex gap-2"
    >
      <v-icon
        scale="2"
        name="ri-heart-pulse-line"
        fill="var(--info-425-625)"
      />
      <h3>Monitoring</h3>
    </div>
  </div>
  <div
    class="flex flex-col gap-4"
  >
    <DsoBadge
      :ressource="{
        ...project,
        ressourceKey: 'locked',
        wording: `Projet ${project?.name}`
      }"
    />
    <DsoBadge
      :ressource="{
        ...project,
        ressourceKey: 'status',
        wording: `Projet ${project?.name}`
      }"
    />
    <DsoBadge
      v-for="environment in project?.environments"
      :key="environment?.id"
      :ressource="{
        ...environment,
        ressourceKey: 'status',
        wording: `Environnement ${environment?.name}`
      }"
    />
    <DsoBadge
      v-for="repository in project?.repositories"
      :key="repository?.id"
      :ressource="{
        ...repository,
        ressourceKey: 'status',
        wording: `Dépôt ${repository?.internalRepoName}`
      }"
    />
  </div>
  <div
    v-if="isOwner"
    data-testid="archiveProjectZone"
    class="danger-zone"
  >
    <div class="flex justify-between items-center <md:flex-col">
      <DsfrButton
        v-show="!isArchivingProject"
        data-testid="showArchiveProjectBtn"
        :label="`Archiver le projet ${project?.name}`"
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
          @click="archiveProject(project?.id)"
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
