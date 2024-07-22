<script lang="ts" setup>
import { ref, onBeforeMount } from 'vue'
import { useProjectStore } from '@/stores/project.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { descriptionMaxLength, projectIsLockedInfo, type Project, ProjectAuthorized } from '@cpn-console/shared'
import router from '@/router/index.js'
import { copyContent } from '@/utils/func.js'
import { useStageStore } from '@/stores/stage.js'

const projectStore = useProjectStore()
const snackbarStore = useSnackbarStore()
const stageStore = useStageStore()

const description = ref<string | undefined>(projectStore.selectedProject?.description ?? undefined)
const isEditingDescription = ref(false)
const isArchivingProject = ref(false)
const projectToArchive = ref('')
const isSecretShown = ref(false)
const projectSecrets = ref<Record<string, any>>({})
const allStages = ref<Array<any>>([])

const updateProject = async (projectId?: Project['id']) => {
  if (!projectId) return
  snackbarStore.isWaitingForResponse = true
  await projectStore.updateProject(projectId, { description: description.value })
  isEditingDescription.value = false
  snackbarStore.isWaitingForResponse = false
}

const isReprovisionning = ref(false)
const replayHooks = async (projectId: Project['id']) => {
  if (isReprovisionning.value) return
  isReprovisionning.value = true
  await useProjectStore().replayHooksForProject(projectId)
  snackbarStore.setMessage('Le projet a été reprovisionné avec succès', 'success')
  isReprovisionning.value = false
}

const archiveProject = async (projectId: Project['id']) => {
  snackbarStore.isWaitingForResponse = true
  await projectStore.archiveProject(projectId)
  router.push('/projects')
  snackbarStore.isWaitingForResponse = false
}

const getDynamicTitle = (locked?: Project['locked'], description?: Project['description']) => {
  if (locked) return projectIsLockedInfo
  if (description) return 'Editer la description'
  return 'Ajouter une description'
}

const isSearchingSecret = ref(false)
const handleSecretDisplay = async () => {
  if (isSecretShown.value) snackbarStore.hideMessage()
  if (isSearchingSecret.value || !projectStore.selectedProject) return

  isSearchingSecret.value = true
  isSecretShown.value = !isSecretShown.value
  if (isSecretShown.value && !Object.keys(projectSecrets.value).length) {
    projectSecrets.value = await projectStore.getProjectSecrets(projectStore.selectedProject.id) ?? {}
    snackbarStore.setMessage('Secrets récupérés')
  }
  isSearchingSecret.value = false
}

const getRows = (service: string) => {
  return [Object.values(projectSecrets.value[service]).map(value => ({
    component: 'pre',
    text: value,
    title: 'Copier la valeur',
    class: 'fr-text-default--info text-xs cursor-pointer m-1',
    // @ts-ignore
    onClick: () => copyContent(value),
  }),
  )]
}

onBeforeMount(async () => {
  allStages.value = await stageStore.getAllStages()
})
</script>

<template>
  <DsoSelectedProject />
  <div
    v-if="projectStore.selectedProject"
    class="relative"
  >
    <div
      class="fr-callout fr-my-8w"
    >
      <h1
        class="fr-callout__title fr-mb-3w"
      >
        {{ projectStore.selectedProject.name }}
      </h1>
      <div
        v-if="!isEditingDescription"
        class="flex gap-4 items-center"
      >
        <p
          v-if="projectStore.selectedProject.description"
          data-testid="descriptionP"
        >
          {{ projectStore.selectedProject.description }}
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
          :title="getDynamicTitle(projectStore.selectedProject.locked, projectStore.selectedProject.description)"
          :disabled="projectStore.selectedProject.locked || !ProjectAuthorized.Manage({ projectPermissions: projectStore.selectedProjectPerms})"
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
            @click="updateProject(projectStore.selectedProject.id)"
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
      v-if="projectStore.selectedProject"
      class="flex flex-col gap-4"
    >
      <DsoBadge
        :resource="{
          ...projectStore.selectedProject,
          locked: projectStore.selectedProject.locked ? 'true' : 'false',
          resourceKey: 'locked',
          wording: `Projet ${projectStore.selectedProject.name}`
        }"
      />
      <DsoBadge
        :resource="{
          ...projectStore.selectedProject,
          resourceKey: 'status',
          wording: `Projet ${projectStore.selectedProject.name}`
        }"
      />
    </div>
    <div
      v-if="ProjectAuthorized.ReplayHooks({ projectPermissions: projectStore.selectedProjectPerms})"
      class="fr-mt-2w"
    >
      <DsfrButton
        data-testid="replayHooksBtn"
        label="Reprovisionner le projet"
        :icon="{ name: 'ri-refresh-fill', animation: isReprovisionning ? 'spin': '' }"
        secondary
        @click="replayHooks(projectStore.selectedProject.id ?? '')"
      />
    </div>
    <div
      class="fr-mt-2w"
    >
      <DsfrButton
        v-if="ProjectAuthorized.SeeSecrets({ projectPermissions: projectStore.selectedProjectPerms})"
        type="buttonType"
        data-testid="showSecretsBtn"
        :label="`${isSecretShown ? 'Cacher' : 'Afficher'} les secrets des services`"
        secondary
        :icon="isSearchingSecret
          ? { name: 'ri-refresh-fill', animation: 'spin' }
          : isSecretShown ? 'ri-eye-off-line' : 'ri-eye-line'"
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
            title=""
          />
        </div>
      </div>
    </div>
    <div
      v-if="ProjectAuthorized.Manage({ projectPermissions: projectStore.selectedProjectPerms})"
      data-testid="archiveProjectZone"
      class="danger-zone"
    >
      <div class="danger-zone-btns">
        <DsfrButton
          v-show="!isArchivingProject"
          data-testid="showArchiveProjectBtn"
          :label="`Supprimer le projet ${projectStore.selectedProject.name}`"
          primary
          icon="ri-delete-bin-7-line"
          @click="isArchivingProject = true"
        />
        <DsfrAlert
          class="<md:mt-2"
          description="La suppression du projet est irréversible."
          type="warning"
          small
        />
      </div>
      <div
        v-if="isArchivingProject"
        class="fr-mt-4w"
      >
        <DsfrAlert
          class="<md:mt-2 fr-mb-2w"
          description="La suppression du projet entraîne la suppression de toutes les ressources applicatives associées."
          type="info"
          small
        />
        <DsfrInput
          v-model="projectToArchive"
          data-testid="archiveProjectInput"
          :label="`Veuillez taper '${projectStore.selectedProject.name}' pour confirmer la suppression du projet`"
          label-visible
          :placeholder="projectStore.selectedProject.name"
          class="fr-mb-2w"
        />
        <div
          class="flex justify-between"
        >
          <DsfrButton
            data-testid="archiveProjectBtn"
            :label="`Supprimer définitivement le projet ${projectStore.selectedProject.name}`"
            :disabled="projectToArchive !== projectStore.selectedProject.name"
            secondary
            icon="ri-delete-bin-7-line"
            @click="archiveProject(projectStore.selectedProject ? projectStore.selectedProject.id : '')"
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
  <!-- N'est jamais sensé s'afficher -->
  <ErrorGoBackToProjects
    v-else
  />
</template>
