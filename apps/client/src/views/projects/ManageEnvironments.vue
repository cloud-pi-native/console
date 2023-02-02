<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import DsoSelectedProject from './DsoSelectedProject.vue'
import { useProjectStore } from '@/stores/project.js'
import EnvironmentForm from '@/components/EnvironmentForm.vue'
import { allEnv } from 'shared/src/utils/iterables.js'

const projectStore = useProjectStore()

const selectedProject = computed(() => projectStore.selectedProject)
const environmentNames = computed(() => environments.value.map(env => env.title))
const environments = ref([])
const selectedEnvironment = ref({})
const isNewEnvironmentForm = ref(false)

const setEnvironmentsTiles = (selectedProject) => {
  environments.value = selectedProject.environments?.map(environment => ({
    id: environment.id,
    title: environment.name,
    data: environment,
  }))
}

const setSelectedEnvironment = (environment) => {
  if (selectedEnvironment.value.id === environment.id) {
    selectedEnvironment.value = {}
    return
  }
  selectedEnvironment.value = environment
  cancel()
}

const showNewEnvironmentForm = () => {
  isNewEnvironmentForm.value = !isNewEnvironmentForm.value
  selectedEnvironment.value = {}
}

const cancel = () => {
  isNewEnvironmentForm.value = false
}

const addEnvironment = async (environment) => {
  cancel()
  await projectStore.addEnvironmentToProject(environment)
}

onMounted(() => {
  setEnvironmentsTiles(selectedProject.value)
})

watch(selectedProject, () => {
  setEnvironmentsTiles(selectedProject.value)
})
</script>

<template>
  <DsoSelectedProject />
  <div
    v-if="environmentNames.length !== allEnv.length"
    class="flex <md:flex-col-reverse items-center justify-between pb-5"
  >
    <DsfrButton
      label="Ajouter un nouvel environnement"
      data-testid="addEnvironmentLink"
      tertiary
      class="fr-mt-2v <md:mb-2"
      icon="ri-add-line"
      @click="showNewEnvironmentForm()"
    />
  </div>
  <div
    v-if="isNewEnvironmentForm"
    class="my-5 pb-10 border-grey-900 border-y-1"
  >
    <EnvironmentForm
      :environment="{projectId: selectedProject.id}"
      :environment-names="environmentNames"
      :project-members="selectedProject.users"
      @add="(environment) => addEnvironment(environment)"
      @cancel="cancel()"
    />
  </div>
  <div
    v-for="environment in environments"
    :key="environment.id"
    class="fr-mt-2v fr-mb-4w"
  >
    <DsfrTile
      :title="environment.title"
      :data-testid="`environmentTile-${environment.title}`"
      :horizontal="true"
      class="fr-mb-2w"
      @click="setSelectedEnvironment(environment.data)"
    />
    <EnvironmentForm
      v-if="Object.keys(selectedEnvironment).length !== 0 && selectedEnvironment.id === environment.id"
      :environment="selectedEnvironment"
      :project-members="selectedProject.users"
      :is-editable="false"
    />
  </div>
</template>
