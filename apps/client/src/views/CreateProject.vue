<script lang="ts" setup>
import type { Ref } from 'vue'
import { computed, ref } from 'vue'
import type {
  projectContract,
} from '@cpn-console/shared'
import {
  ProjectSchemaV2,
  descriptionMaxLength,
  instanciateSchema,
  parseZodError,
  projectNameMaxLength,
} from '@cpn-console/shared'
import { useProjectStore } from '@/stores/project.js'
import { useUserStore } from '@/stores/user.js'
import router from '@/router/index.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import ProjectSettings from '@/components/ProjectSettings.vue'

const projectStore = useProjectStore()
const userStore = useUserStore()
const snackbarStore = useSnackbarStore()
const buttonState = ref({
  isCreating: false,
})

const project = ref<typeof projectContract.createProject.body._type>({
  name: '',
  description: '',
  limitless: false,
  hprodCpu: 0,
  hprodGpu: 0,
  hprodMemory: 0,
  prodCpu: 0,
  prodGpu: 0,
  prodMemory: 0,
})

const remainingCharacters = computed(() => {
  return projectNameMaxLength - project.value?.name.length
})
const errorSchema = computed(() => {
  const schemaValidation = ProjectSchemaV2.pick({ name: true, description: true }).safeParse(project.value)
  return schemaValidation.success ? undefined : schemaValidation.error
})

const updatedValues: Ref<Record<any, any>> = ref({})

async function createProject() {
  buttonState.value.isCreating = true
  updatedValues.value = instanciateSchema(ProjectSchemaV2, true)
  if (errorSchema.value) {
    snackbarStore.setMessage(parseZodError(errorSchema.value))
  } else if (project.value) {
    try {
      const newProject = await projectStore.createProject(project.value)
      await nextTick()
      await router.push({
        name: 'Project',
        params: { slug: newProject.slug },
      })
    } catch (error) {
      snackbarStore.setMessage((error as Error)?.message, 'error')
    } finally {
      buttonState.value.isCreating = false
    }
  }
}

function updateProject(key: 'name' | 'description', value: string) {
  project.value[key] = value
  updatedValues.value[key] = true
}
</script>

<template>
  <div class="relative">
    <h1 class="fr-h1">
      Commander un espace projet
    </h1>
    <DsfrFieldset
      legend="Informations du projet"
      hint="Les champs munis d'une astérisque (*) sont requis."
    >
      <DsfrAlert
        type="info"
        data-testid="ownerInfo"
        :description="`L'adresse e-mail du souscripteur associé au projet sera : ${userStore.userProfile?.email}`"
        small
        class="fr-mb-2w"
      />
      <div class="fr-mb-6v">
        <div class="fr-mb-1v">
          <DsfrInputGroup
            v-model="project.name"
            data-testid="nameInput"
            type="text"
            :required="true"
            :error-message="!!updatedValues.name && !ProjectSchemaV2.pick({ name: true }).safeParse({ name: project.name }).success ? `Le nom du projet doit être en minuscule, ne pas contenir d\'espace ni de trait d'union, faire plus de 2 et moins de ${projectNameMaxLength} caractères.` : undefined"
            label="Nom du projet"
            label-visible
            :hint="`Nom du projet dans l'offre Cloud π Native. Ne doit pas contenir d'espace, être en minuscules, faire plus de 2 et moins de ${projectNameMaxLength} caractères.`"
            placeholder="candilib"
            :disabled="buttonState.isCreating"
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
        :disabled="buttonState.isCreating"
        @update:model-value="updateProject('description', $event)"
      />
    </DsfrFieldset>
    <ProjectSettings :project="project" />
    <DsfrButton
      label="Commander mon espace projet"
      data-testid="createProjectBtn"
      primary
      class="fr-mt-2w"
      :disabled="!!errorSchema || buttonState.isCreating"
      :icon="buttonState.isCreating
        ? { name: 'ri:refresh-line', animation: 'spin' }
        : 'ri:send-plane-line'"
      @click="createProject()"
    />
  </div>
</template>
