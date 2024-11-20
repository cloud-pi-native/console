<script lang="ts" setup>
import { onBeforeMount, ref } from 'vue'
import type { ProjectV2 } from '@cpn-console/shared'
import { ProjectAuthorized, descriptionMaxLength, projectIsLockedInfo } from '@cpn-console/shared'
import { useProjectStore } from '@/stores/project.js'
import router from '@/router/index.js'
import { copyContent } from '@/utils/func.js'
import { useStageStore } from '@/stores/stage.js'
import { useLogStore } from '@/stores/log.js'

const props = defineProps<{ projectId: ProjectV2['id'] }>()

const projectStore = useProjectStore()
const stageStore = useStageStore()
const project = computed(() => projectStore.projectsById[props.projectId])

const description = ref(project.value.description)
const isEditingDescription = ref(false)
const isArchivingProject = ref(false)
const projectToArchive = ref('')
const isSecretShown = ref(false)
const projectSecrets = ref<Record<string, any>>({})
const allStages = ref<Array<any>>([])
const logStore = useLogStore()

async function updateProject() {
  project.value.Commands.update({ description: description.value })
  isEditingDescription.value = false
}

async function archiveProject() {
  await project.value.Commands.delete()
  projectStore.lastSelectedProjectId = undefined
  router.push('/projects')
  delete projectStore.projectsById[project.value.id]
}

function getDynamicTitle(locked?: ProjectV2['locked'], description?: ProjectV2['description']) {
  if (locked) return projectIsLockedInfo
  if (description) return 'Editer la description'
  return 'Ajouter une description'
}

async function handleSecretDisplay() {
  isSecretShown.value = !isSecretShown.value
  if (isSecretShown.value && !Object.keys(projectSecrets.value).length) {
    projectSecrets.value = await project.value.Services.getSecrets()
  }
}

function getRows(service: string) {
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
  logStore.needRefresh = true
})
onMounted(() => {
  logStore.needRefresh = true
})
</script>

<template>
  <div
    :key="project.id"
    class="relative"
  >
    <div
      class="fr-callout"
    >
      <h1
        class="fr-callout__title fr-mb-3w"
      >
        {{ project.name }}<h2 class="fr-callout__title fr-mb-3w italic inline opacity-70">
          ({{ project.organization.label }})
        </h2>
      </h1>
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
        <p
          v-else
          data-testid="descriptionP"
          class="disabled"
        >
          Aucune description pour le moment...
        </p>
        <DsfrButton
          class="fr-mt-0"
          icon="ri:pencil-fill"
          data-testid="setDescriptionBtn"
          :title="getDynamicTitle(project.locked, project.description)"
          :disabled="project.locked || !ProjectAuthorized.Manage({ projectPermissions: project.myPerms })"
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
            :icon="project.operationsInProgress.includes('update')
              ? { name: 'ri:refresh-fill', animation: 'spin' }
              : 'ri:send-plane-line'"
            :disabled="project.operationsInProgress.includes('update')"
            @click="updateProject()"
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
          name="ri:heart-pulse-line"
          fill="var(--info-425-625)"
        />
        <h3>Monitoring</h3>
      </div>
    </div>
    <div
      class="flex flex-row justify-between "
    >
      <div
        class="flex flex-col gap-4"
      >
        <DsoBadge
          :resource="{
            ...project,
            locked: project.locked ? 'true' : 'false',
            resourceKey: 'locked',
            wording: `Projet ${project.name}`,
          }"
        />
        <DsoBadge
          :resource="{
            ...project,
            resourceKey: 'status',
            wording: `Projet ${project.name}`,
          }"
        />
      </div>
    </div>
    <ReplayButton
      :project-id="project.id"
    />
    <div
      class="fr-mt-2w"
    >
      <DsfrButton
        v-if="ProjectAuthorized.SeeSecrets({ projectPermissions: project.myPerms })"
        data-testid="showSecretsBtn"
        :label="`${isSecretShown ? 'Cacher' : 'Afficher'} les secrets des services`"
        secondary
        :icon="project.operationsInProgress.includes('searchSecret')
          ? { name: 'ri:refresh-fill', animation: 'spin' }
          : isSecretShown ? 'ri:eye-off-line' : 'ri:eye-line'"
        :disabled="project.operationsInProgress.includes('searchSecret')"
        @click="handleSecretDisplay"
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
      v-if="ProjectAuthorized.Manage({ projectPermissions: project.myPerms })"
      data-testid="archiveProjectZone"
      class="danger-zone"
    >
      <div class="danger-zone-btns">
        <DsfrButton
          v-show="!isArchivingProject"
          data-testid="showArchiveProjectBtn"
          :label="`Supprimer le projet ${project.name}`"
          primary
          icon="ri:delete-bin-7-line"
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
          :label="`Veuillez taper '${project.name}' pour confirmer la suppression du projet`"
          label-visible
          :placeholder="project.name"
          class="fr-mb-2w"
        />
        <div
          class="flex justify-between"
        >
          <DsfrButton
            data-testid="archiveProjectBtn"
            :label="`Supprimer définitivement le projet ${project.name}`"
            :disabled="projectToArchive !== project.name || project.operationsInProgress.includes('delete')"
            secondary
            :icon="project.operationsInProgress.includes('delete')
              ? { name: 'ri:refresh-fill', animation: 'spin' }
              : 'ri:delete-bin-7-line'"
            @click="archiveProject"
          />
          <DsfrButton
            label="Annuler"
            primary
            @click="isArchivingProject = false"
          />
        </div>
      </div>
    </div>
  </div>
</template>
