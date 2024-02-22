<script lang="ts" setup>
import { ref, computed, onBeforeMount } from 'vue'
import { useProjectStore } from '@/stores/project.js'
import { useUserStore } from '@/stores/user.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useProjectEnvironmentStore } from '@/stores/project-environment'
import { descriptionMaxLength, projectIsLockedInfo, type ProjectInfos } from '@cpn-console/shared'
import router from '@/router/index.js'
import { copyContent } from '@/utils/func.js'

const projectStore = useProjectStore()
const userStore = useUserStore()
const snackbarStore = useSnackbarStore()
const projectEnvironmentStore = useProjectEnvironmentStore()

const project = computed(() => projectStore.selectedProject)
const isOwner = computed(() => project.value?.roles.some(role => role.userId === userStore.userProfile.id && role.role === 'owner'))

const description = ref<string | undefined>(project.value ? project.value.description : undefined)
const isEditingDescription = ref(false)
const isArchivingProject = ref(false)
const projectToArchive = ref('')
const isSecretShown = ref(false)
const projectSecrets = ref<Record<string, any>>({})
const allStages = ref<Array<any>>([])

const updateProject = async (projectId: ProjectInfos['id']) => {
  snackbarStore.isWaitingForResponse = true
  // @ts-ignore
  await projectStore.updateProject(projectId, { description: description.value })
  isEditingDescription.value = false
  snackbarStore.isWaitingForResponse = false
}

const archiveProject = async (projectId: ProjectInfos['id']) => {
  snackbarStore.isWaitingForResponse = true
  await projectStore.archiveProject(projectId)
  router.push('/projects')
  snackbarStore.isWaitingForResponse = false
}

const getDynamicTitle = (locked: ProjectInfos['locked'], description: ProjectInfos['description']) => {
  if (locked) return projectIsLockedInfo
  if (description) return 'Editer la description'
  return 'Ajouter une description'
}

const handleSecretDisplay = async () => {
  isSecretShown.value = !isSecretShown.value
  if (isSecretShown.value && !Object.keys(projectSecrets.value).length) {
    snackbarStore.isWaitingForResponse = true
    if (!project.value) throw new Error('Pas de projet sélectionné')
    projectSecrets.value = await projectStore.getProjectSecrets(project.value.id)
    snackbarStore.setMessage('Secrets récupérés')
    snackbarStore.isWaitingForResponse = false
  }
}

const getRows = (service: string) => {
  return [Object.values(projectSecrets.value[service]).map(value => ({
    component: 'code',
    text: value,
    title: 'Copier la valeur',
    class: 'fr-text-default--info text-xs cursor-pointer',
    // @ts-ignore
    onClick: () => copyContent(value),
  }),
  )]
}

onBeforeMount(async () => {
  allStages.value = await projectEnvironmentStore.getStages()
})
</script>

<template>
  <DsoSelectedProject />
  <div
    class="relative"
  >
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
        <p
          v-else
          data-testid="descriptionP"
          class="disabled"
        >
          Aucune description pour le moment...
        </p>
        <DsfrButton
          class="fr-mt-0"
          icon="ri-pencil-fill"
          data-testid="setDescriptionBtn"
          :title="getDynamicTitle(project?.locked, project?.description)"
          :disabled="project?.locked"
          icon-only
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
        :resource="{
          ...project,
          resourceKey: 'locked',
          wording: `Projet ${project?.name}`
        }"
      />
      <DsoBadge
        :resource="{
          ...project,
          resourceKey: 'status',
          wording: `Projet ${project?.name}`
        }"
      />
      <DsoBadge
        v-for="environment in project?.environments"
        :key="environment?.id"
        :resource="{
          ...environment,
          resourceKey: 'status',
          wording: `Environnement ${environment?.name}`
        }"
      />
      <DsoBadge
        v-for="repository in project?.repositories"
        :key="repository?.id"
        :resource="{
          ...repository,
          resourceKey: 'status',
          wording: `Dépôt ${repository?.internalRepoName}`
        }"
      />
    </div>
    <div
      class="fr-mt-2w"
    >
      <DsfrButton
        v-if="isOwner"
        type="buttonType"
        data-testid="showSecretsBtn"
        :label="`${isSecretShown ? 'Cacher' : 'Afficher'} les secrets des services`"
        secondary
        :icon="isSecretShown ? 'ri-eye-off-line' : 'ri-eye-line'"
        @click="handleSecretDisplay()"
      />
      <div
        v-if="isSecretShown"
        class="fr-mt-4w"
        data-testid="projectSecretsZone"
      >
        <p
          v-if="!Object.keys(projectSecrets).length"
          data-testid="noProjectSecretsP"
        >
          Aucun secret à afficher
        </p>
        <div
          v-for="service of Object.keys(projectSecrets)"
          :key="service"
        >
          <h3 class="fr-mb-1w fr-mt-3w">
            {{ service }}
          </h3>
          <DsfrTable
            class="horizontal-table"
            :headers="Object.keys(projectSecrets[service])"
            :rows="getRows(service)"
          />
        </div>
      </div>
    </div>
    <div
      v-if="isOwner"
      data-testid="archiveProjectZone"
      class="danger-zone"
    >
      <div class="danger-zone-btns">
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
            @click="archiveProject(project ? project.id : '')"
          />
          <DsfrButton
            label="Annuler"
            primary
            @click="isArchivingProject = false"
          />
        </div>
      </div>
    </div>
    <LoadingCt
      v-if="snackbarStore.isWaitingForResponse"
      description="Opérations en cours"
    />
  </div>
</template>
