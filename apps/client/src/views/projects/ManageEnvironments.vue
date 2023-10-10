<script lang="ts" setup>
import { ref, computed, watch, onMounted, type Ref } from 'vue'
import DsoSelectedProject from './DsoSelectedProject.vue'
import { useProjectStore } from '@/stores/project.js'
import { useProjectEnvironmentStore } from '@/stores/project-environment.js'
import EnvironmentForm from '@/components/EnvironmentForm.vue'
import { projectIsLockedInfo, sortArrByObjKeyAsc } from '@dso-console/shared'
import { useUserStore } from '@/stores/user.js'
import { useSnackbarStore } from '@/stores/snackbar.js'

const projectStore = useProjectStore()
const projectEnvironmentStore = useProjectEnvironmentStore()
const userStore = useUserStore()
const snackbarStore = useSnackbarStore()

const project = computed(() => projectStore.selectedProject)
const owner = computed(() => projectStore.selectedProjectOwner)
const isOwner = computed(() => owner.value?.id === userStore.userProfile.id)
// @ts-ignore
const environmentNames = computed(() => environments.value.map(env => env.title))

const environments = ref([])
const selectedEnvironment = ref({})
const isNewEnvironmentForm = ref(false)
const isUpdatingEnvironment = ref(false)
const allStages: Ref<any[]> = ref([])

// @ts-ignore
const setEnvironmentsTiles = (project) => {
  // @ts-ignore
  environments.value = sortArrByObjKeyAsc(project?.environments, 'name')
    ?.map(environment => ({
      id: environment.id,
      title: environment.name,
      data: environment,
      status: environment.status,
    }))
}

// @ts-ignore
const setSelectedEnvironment = (environment) => {
  // @ts-ignore
  if (selectedEnvironment.value.id === environment.id || ['deleting', 'initializing'].includes(environment?.status)) {
    selectedEnvironment.value = {}
    return
  }
  selectedEnvironment.value = environment
  // @ts-ignore
  selectedEnvironment.value.clustersId = selectedEnvironment.value.clusters?.map(cluster => cluster.id)
  isNewEnvironmentForm.value = false
}

const showNewEnvironmentForm = () => {
  isNewEnvironmentForm.value = !isNewEnvironmentForm.value
  selectedEnvironment.value = {}
}

const cancel = () => {
  isNewEnvironmentForm.value = false
  selectedEnvironment.value = {}
}

// @ts-ignore
const addEnvironment = async (environment) => {
  isUpdatingEnvironment.value = true
  // @ts-ignore
  if (!project.value.locked) {
    try {
      await projectEnvironmentStore.addEnvironmentToProject(environment)
    } catch (error) {
      // @ts-ignore
      snackbarStore.setMessage(error?.message, 'error')
    }
  }
  cancel()
  isUpdatingEnvironment.value = false
}

// @ts-ignore
const putEnvironment = async (environment) => {
  isUpdatingEnvironment.value = true
  // @ts-ignore
  if (!project.value.locked) {
    try {
      await projectEnvironmentStore.updateEnvironment(environment)
    } catch (error) {
      // @ts-ignore
      snackbarStore.setMessage(error?.message, 'error')
    }
  }
  cancel()
  isUpdatingEnvironment.value = false
}

// @ts-ignore
const deleteEnvironment = async (environment) => {
  isUpdatingEnvironment.value = true
  try {
    await projectEnvironmentStore.deleteEnvironment(environment.id)
  } catch (error) {
    // @ts-ignore
    snackbarStore.setMessage(error?.message, 'error')
  }
  setSelectedEnvironment({})
  isUpdatingEnvironment.value = false
}

onMounted(async () => {
  try {
    allStages.value = await projectEnvironmentStore.getStages()
  } catch (error) {
    if (error instanceof Error) {
      snackbarStore.setMessage(error.message)
      return
    }
    snackbarStore.setMessage('échec de récupération des environnements DSO')
  }
  setEnvironmentsTiles(project.value)
})

watch(project, () => {
  setEnvironmentsTiles(project.value)
})
</script>

<template>
  <DsoSelectedProject />
  <div
    v-if="environmentNames.length !== allStages.length"
    class="flex <md:flex-col-reverse items-center justify-between pb-5"
  >
    <DsfrButton
      label="Ajouter un nouvel environnement"
      data-testid="addEnvironmentLink"
      tertiary
      :disabled="project?.locked"
      :title="project?.locked ? projectIsLockedInfo : 'Ajouter un nouvel environnement'"
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
      :environment="{projectId: project?.id}"
      :environment-names="environmentNames"
      :is-updating-environment="isUpdatingEnvironment"
      :is-project-locked="project?.locked"
      :project-clusters="project?.clusters"
      :all-stages="allStages"
      @add-environment="(environment) => addEnvironment(environment)"
      @cancel="cancel()"
    />
  </div>
  <div
    :class="{
      'md:grid md:grid-cols-3 md:gap-3 items-center justify-between': !selectedEnvironment.id,
    }"
  >
    <div
      v-for="environment in environments"
      :key="environment.id"
      class="fr-mt-2v fr-mb-4w"
    >
      <div>
        <DsfrTile
          :title="environment.title"
          :description="['deleting', 'initializing'].includes(environment.status) ? 'Opérations en cours' : null"
          :data-testid="`environmentTile-${environment.title}`"
          :horizontal="!!selectedEnvironment.id"
          :disabled="['deleting', 'initializing'].includes(environment.status)"
          class="fr-mb-2w w-11/12"
          @click="setSelectedEnvironment(environment.data)"
        />
        <DsfrBadge
          v-if="environment.data?.status === 'initializing'"
          :data-testid="`${environment.title}-${environment.data?.status}-badge`"
          type="info"
          label="Environnement en cours de création"
        />
        <DsfrBadge
          v-else-if="environment.data?.status === 'deleting'"
          :data-testid="`${environment.title}-${environment.data?.status}-badge`"
          type="info"
          label="Environnement en cours de suppression"
        />
        <DsfrBadge
          v-else-if="environment.data?.status === 'failed'"
          :data-testid="`${environment.title}-${environment.data?.status}-badge`"
          type="error"
          label="Echec des opérations"
        />
        <DsfrBadge
          v-else
          :data-testid="`${environment.title}-${environment.data?.status}-badge`"
          type="success"
          label="Environnement correctement déployé"
        />
      </div>
      <EnvironmentForm
        v-if="Object.keys(selectedEnvironment).length !== 0 && selectedEnvironment.id === environment.id"
        :environment="selectedEnvironment"
        :environment-names="environmentNames"
        :all-stages="allStages"
        :is-updating-environment="isUpdatingEnvironment"
        :project-clusters="project?.clusters"
        :is-editable="false"
        :is-project-locked="project?.locked"
        :is-owner="isOwner"
        @put-environment="(environment) => putEnvironment(environment)"
        @delete-environment="(environment) => deleteEnvironment(environment)"
        @cancel="cancel()"
      />
    </div>
    <div
      v-if="!environments.length"
    >
      <p>Aucun environnement déployé</p>
    </div>
  </div>
</template>
