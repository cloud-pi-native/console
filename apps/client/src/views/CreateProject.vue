<script setup>
import { computed, onMounted, ref } from 'vue'
import { useProjectStore } from '@/stores/project.js'
import { useUserStore } from '@/stores/user.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useOrganizationStore } from '@/stores/organization.js'
import { projectSchema } from 'shared/src/schemas/project.js'
import { schemaValidator, isValid, instanciateSchema } from 'shared/src/utils/schemas.js'
import { calcProjectNameMaxLength } from 'shared/src/utils/functions.js'
import router from '@/router/index.js'

const snackbarStore = useSnackbarStore()
const projectStore = useProjectStore()
const userStore = useUserStore()
const organizationStore = useOrganizationStore()

const owner = computed(() => userStore.userProfile)
const organizationName = computed(() => {
  const org = orgOptions?.value.find(org => org.id === project.value?.organization)
  return org?.value
})
const projectNameMaxLength = computed(() => {
  return calcProjectNameMaxLength(organizationName?.value)
})
const remainingCharacters = computed(() => {
  return projectNameMaxLength?.value - project.value?.name.length
})

/**
 * Defines a project
 *
 * @typedef {object} project
 * @property {string} organization
 * @property {string} name
 */
const project = ref({
  organization: undefined,
  name: '',
})

const orgOptions = ref([])

const updatedValues = ref({})

const createProject = async () => {
  updatedValues.value = instanciateSchema({ schema: projectSchema }, true)
  const keysToValidate = ['organization', 'name']
  const errorSchema = schemaValidator(projectSchema, project.value, { keysToValidate, context: { projectNameMaxLength: projectNameMaxLength.value } })
  if (Object.keys(errorSchema).length === 0) {
    try {
      await projectStore.createProject(project.value)
      router.push('/projects')
    } catch (error) {
      snackbarStore.setMessage(error?.message, 'error')
    }
  }
}

const updateProject = (key, value) => {
  if (key === 'organization') {
    const org = orgOptions.value.find(org => org.value === value)
    project.value[key] = org.id
  } else {
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
  <h1
    class="fr-h1"
  >
    Commander un espace projet
  </h1>
  <DsfrFieldset
    legend="Informations du projet"
    hint="Tous les champs sont requis"
  >
    <DsfrAlert
      type="info"
      :description="`L'adresse e-mail du souscripteur associé au projet sera : ${owner.email}`"
      small
      class="fr-mb-2w"
    />
    <DsfrSelect
      v-model="project.organization"
      select-id="organization-select"
      required
      label="Nom de l'organisation"
      label-visible
      :options="orgOptions"
      @update:model-value="updateProject('organization', $event)"
    />
    <div
      class="fr-mb-0"
    >
      <DsfrInputGroup
        v-model="project.name"
        data-testid="nameInput"
        type="text"
        required="required"
        :error-message="!!updatedValues.name && !isValid(projectSchema, project, 'name', { projectNameMaxLength }) ? `Le nom du projet doit être en minuscule, ne pas contenir d\'espace et faire moins de ${projectNameMaxLength} caractères.`: undefined"
        label="Nom du projet"
        label-visible
        :hint="`Nom du projet dans l'offre Cloud π Native. Ne doit pas contenir d'espace, doit être unique pour l'organisation, doit être en minuscules, doit faire moins de ${projectNameMaxLength} caractères.`"
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
  </DsfrFieldset>
  <DsfrButton
    label="Commander mon espace projet"
    data-testid="createProjectBtn"
    primary
    class="fr-mt-2w"
    :disabled="!project.organization || !isValid(projectSchema, project, 'name', { projectNameMaxLength })"
    icon="ri-send-plane-line"
    @click="createProject()"
  />
</template>
