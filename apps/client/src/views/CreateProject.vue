<script setup>
import { computed, onMounted, ref } from 'vue'
import { useProjectStore } from '@/stores/project.js'
import { useUserStore } from '@/stores/user.js'
import { projectSchema, envList } from 'shared/src/schemas/project.js'
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
  orgName: undefined,
  projectName: undefined,
  envList,
})

const envOptions = ref([])

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
  const keysToValidate = ['orgName', 'projectName']
  const errorSchema = schemaValidator(projectSchema, project.value, keysToValidate)

  if (Object.keys(errorSchema).length === 0) {
    await projectStore.createProject(project.value)
    router.push('/projects')
  }
}

const updateProject = (key, value) => {
  project.value[key] = value
  updatedValues.value[key] = true
}

const setEnvOptions = () => {
  envList.forEach(opt => {
    envOptions.value.push({
      label: opt,
      id: opt,
      name: opt,
    })
  })
}

onMounted(() => {
  setEnvOptions()
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
      v-model="project.orgName"
      data-testid="orgNameSelect"
      required
      label="Nom de l'organisation"
      label-visible
      :options="orgOptions"
      @update:model-value="updateProject('orgName', $event)"
    />
    <DsfrInput
      v-model="project.projectName"
      data-testid="projectNameInput"
      type="text"
      required="required"
      :is-valid="!!updatedValues.projectName && isValid(projectSchema, project, 'projectName')"
      :is-invalid="!!updatedValues.projectName && !isValid(projectSchema, project, 'projectName')"
      label="Nom du projet"
      label-visible
      hint="Nom du projet dans l'offre Cloud PI Native. Ne doit pas contenir d'espace, doit être unique pour l'organisation, doit être en minuscules."
      placeholder="candilib"
      class="fr-mb-2w"
      @update:model-value="updateProject('projectName', $event)"
    />
    <DsfrCheckboxSet
      v-model="project.envList"
      data-testid="envListSelect"
      legend="Environnements choisis (par défaut, tous les environnements sont sélectionnés)"
      required="required"
      :error-message="!isValid(projectSchema, project, 'envList') ? 'Veuillez sélectionner au moins un environnement.' : ''"
      :options="envOptions"
      @update:model-value="project.envList = $event"
    />
  </DsfrFieldset>
  <DsfrButton
    label="Commander mon espace projet"
    data-testid="createProjectBtn"
    primary
    icon="ri-send-plane-line"
    class="fr-ml-2w"
    @click="createProject()"
  />
</template>
