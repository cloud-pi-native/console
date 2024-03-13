<script lang="ts" setup>
import { computed, onMounted, ref, type Ref } from 'vue'
import { useProjectStore } from '@/stores/project.js'
import { useUserStore } from '@/stores/user.js'
import { useOrganizationStore } from '@/stores/organization.js'
import {
  descriptionMaxLength,
  ProjectSchema,
  type ProjectInfos,
  parseZodError,
  instanciateSchema,
  projectNameMaxLength,
} from '@cpn-console/shared'
import router from '@/router/index.js'
import { useSnackbarStore } from '@/stores/snackbar.js'

const projectStore = useProjectStore()
const userStore = useUserStore()
const organizationStore = useOrganizationStore()
const snackbarStore = useSnackbarStore()

const remainingCharacters = computed(() => {
  return projectNameMaxLength - project.value?.name.length
})
const errorSchema = computed(() => {
  const schemaValidation = ProjectSchema.omit({ id: true, status: true, locked: true }).safeParse(project.value)
  return schemaValidation.success ? undefined : schemaValidation.error
})

// @ts-ignore
const project: Ref<ProjectInfos> = ref({
  organizationId: undefined,
  name: '',
})

const orgOptions: Ref<Array<any>> = ref([])

const updatedValues: Ref<Record<any, any>> = ref({})

const createProject = async () => {
  snackbarStore.isWaitingForResponse = true
  updatedValues.value = instanciateSchema(ProjectSchema, true)
  if (errorSchema.value) {
    snackbarStore.setMessage(parseZodError(errorSchema.value))
  } else {
    await projectStore.createProject(project.value)
    router.push('/projects')
  }
  snackbarStore.isWaitingForResponse = false
}

const updateProject = (key: string, value: any) => {
  if (key === 'organizationId') {
    const org = orgOptions.value.find(org => org.value === value)
    project.value[key] = org.id
  } else {
    // @ts-ignore
    project.value[key] = value
  }
  updatedValues.value[key] = true
}

onMounted(async () => {
  await organizationStore.setOrganizations()
  orgOptions.value = organizationStore.organizations.map(org => ({
    text: org.label,
    value: org.name,
    id: org.id,
  }))
})
</script>

<template>
  <div
    class="relative"
  >
    <h1
      class="fr-h1"
    >
      Commander un espace projet
    </h1>
    <DsfrFieldset
      legend="Informations du projet"
      hint="Les champs munis d'une astérisque (*) sont requis."
    >
      <DsfrAlert
        type="info"
        :description="`L'adresse e-mail du souscripteur associé au projet sera : ${userStore.userProfile?.email}`"
        small
        class="fr-mb-2w"
      />
      <DsfrSelect
        v-model="project.organizationId"
        select-id="organizationId-select"
        required
        label="Nom de l'organisation"
        label-visible
        :options="orgOptions"
        @update:model-value="updateProject('organizationId', $event)"
      />
      <div
        class="fr-mb-6v"
      >
        <div
          class="fr-mb-1v"
        >
          <DsfrInputGroup
            v-model="project.name"
            data-testid="nameInput"
            type="text"
            :required="true"
            :error-message="!!updatedValues.name && !ProjectSchema.pick({name: true}).safeParse({name: project.name}).success ? `Le nom du projet doit être en minuscule, ne pas contenir d\'espace ni de trait d'union, faire plus de 2 et moins de ${projectNameMaxLength} caractères.`: undefined"
            label="Nom du projet"
            label-visible
            :hint="`Nom du projet dans l'offre Cloud π Native. Ne doit pas contenir d'espace, doit être unique pour l'organisation, doit être en minuscules, doit faire plus de 2 et moins de ${projectNameMaxLength} caractères.`"
            placeholder="candilib"
            @update:model-value="updateProject('name', $event)"
          />
        </div>
        <span
          v-if="remainingCharacters >= 0"
          class="fr-hint-text"
        >
          {{ remainingCharacters }} caractères restants
        </span>
      </div>
      <DsfrInput
        v-model="project.description"
        data-testid="descriptionInput"
        :is-textarea="true"
        :maxlength="descriptionMaxLength"
        label="Description du projet"
        label-visible
        :hint="`Courte description expliquant la finalité du projet (${descriptionMaxLength} caractères maximum).`"
        placeholder="Application de réservation de places à l'examen du permis B."
        @update:model-value="updateProject('description', $event)"
      />
    </DsfrFieldset>
    <DsfrButton
      label="Commander mon espace projet"
      data-testid="createProjectBtn"
      primary
      class="fr-mt-2w"
      :disabled="!project.organizationId || !!errorSchema"
      icon="ri-send-plane-line"
      @click="createProject()"
    />
    <LoadingCt
      v-if="snackbarStore.isWaitingForResponse"
      description="Projet en cours de création"
    />
  </div>
</template>
