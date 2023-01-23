<script setup>
import { computed, ref } from 'vue'
import { useProjectStore } from '@/stores/project.js'
import { useUserStore } from '@/stores/user.js'
import { projectSchema } from 'shared/src/schemas/project.js'
import { schemaValidator, isValid, instanciateSchema } from 'shared/src/utils/schemas.js'
import router from '@/router/index.js'

const projectStore = useProjectStore()
const userStore = useUserStore()

const owner = computed(() => userStore.userProfile)

/**
 * Defines a project
 *
 * @typedef {object} project
 * @property {string} orgName
 * @property {string} projectName
 */
const project = ref({
  organization: undefined,
  name: undefined,
})

const orgOptions = ref([
  {
    text: 'Ministère de l\'Intérieur',
    value: 'ministere-interieur',
  },
  {
    text: 'Ministère de la Justice',
    value: 'ministere-justice',
  },
  {
    text: 'Direction Interministérielle du Numérique',
    value: 'dinum',
  },
])

const updatedValues = ref({})

const createProject = async () => {
  updatedValues.value = instanciateSchema({ schema: projectSchema }, true)
  const keysToValidate = ['organization', 'name']
  const errorSchema = schemaValidator(projectSchema, project.value, keysToValidate)
  if (Object.keys(errorSchema).length === 0) {
    await projectStore.createProject(project.value)
    router.push('/projects')
  } else {
    console.log('invalid', errorSchema) // réparer la gestion d'erreur
  }
}

const updateProject = (key, value) => {
  project.value[key] = value
  updatedValues.value[key] = true
}

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
      data-testid="organizationSelect"
      required
      label="Nom de l'organisation"
      label-visible
      :options="orgOptions"
      @update:model-value="updateProject('organization', $event)"
    />
    <DsfrInput
      v-model="project.name"
      data-testid="nameInput"
      type="text"
      required="required"
      :is-valid="!!updatedValues.name && isValid(projectSchema, project, 'name')"
      :is-invalid="!!updatedValues.name && !isValid(projectSchema, project, 'name')"
      label="Nom du projet"
      label-visible
      hint="Nom du projet dans l'offre Cloud PI Native. Ne doit pas contenir d'espace, doit être unique pour l'organisation, doit être en minuscules."
      placeholder="candilib"
      class="fr-mb-2w"
      @update:model-value="updateProject('name', $event)"
    />
  </DsfrFieldset>
  <DsfrButton
    label="Commander mon espace projet"
    data-testid="createProjectBtn"
    primary
    icon="ri-send-plane-line"
    @click="createProject()"
  />
</template>
